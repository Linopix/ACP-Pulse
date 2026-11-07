/**
 * Anmeldung über Microsoft Entra ID.
 * Dieselbe App wie der Kalender. Geheimnis bleibt in service_links.
 * Die Better-Auth-Konfiguration bleibt unangetastet. Die Sitzung ist eine
 * eigene Zeile in "session" plus das signierte Sitzungs-Cookie.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { serializeSignedCookie } from "better-call";
import { getSql } from "@/lib/db";
import { auth, SESSION_TOKEN_COOKIE } from "@/lib/auth/server";

const STATE_COOKIE = "pulse-ms";
const STATE_MAX_AGE = 600;
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

type OfficeApp = { tenant: string; clientId: string; secret: string };

export function appOrigin(request: Request): string {
  const fromEnv = process.env.BETTER_AUTH_URL?.trim() || process.env.PULSE_PUBLIC_HOST?.trim() || "";
  if (fromEnv) {
    const absolute = fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`;
    return new URL(absolute).origin;
  }
  return new URL(request.url).origin;
}

export function redirectUri(origin: string): string {
  return `${origin}/api/microsoft/callback`;
}

export async function beginMicrosoft(request: Request): Promise<Response> {
  const origin = appOrigin(request);
  const office = await readOffice();
  if (!office) return back(origin, "fehlt");
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const sql = await getSql();
  const id = crypto.randomUUID();
  await sql`
    delete from "verification" where "identifier" like 'ms:%' and "expiresAt" < now()
  `;
  await sql`
    insert into "verification" ("id", "identifier", "value", "expiresAt", "createdAt", "updatedAt")
    values (${id}, ${`ms:${state}`}, ${verifier}, now() + interval '10 minutes', now(), now())
  `;
  const url = new URL(`https://login.microsoftonline.com/${office.tenant}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", office.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri(origin));
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  const headers = new Headers({ location: url.toString() });
  headers.append("set-cookie", stateCookie(state, request));
  return new Response(null, { status: 302, headers });
}

export async function finishMicrosoft(request: Request): Promise<Response> {
  const origin = appOrigin(request);
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const cookieState = readCookie(request, STATE_COOKIE);
  if (!state || !code || !same(state, cookieState)) return back(origin, "state");
  const sql = await getSql();
  const rows = await sql<{ value: string }>`
    delete from "verification"
    where "identifier" = ${`ms:${state}`} and "expiresAt" > now()
    returning "value"
  `;
  const verifier = rows[0]?.value ?? "";
  if (!verifier) return back(origin, "state");
  const office = await readOffice();
  if (!office) return back(origin, "fehlt");
  let profile: { id: string; email: string; name: string };
  try {
    profile = await exchange(office, code, verifier, redirectUri(origin));
  } catch (error) {
    console.error("[pulse] microsoft", error);
    return back(origin, "token");
  }
  if (!profile.email) return back(origin, "mail");
  try {
    const userId = await upsertUser(profile);
    const token = randomBytes(32).toString("base64url");
    const sessionId = crypto.randomUUID();
    await sql`
      insert into "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "ipAddress", "userAgent", "userId")
      values (
        ${sessionId},
        now() + interval '7 days',
        ${token},
        now(),
        now(),
        ${""},
        ${request.headers.get("user-agent")?.slice(0, 240) ?? ""},
        ${userId}
      )
    `;
    const ctx = await auth.$context;
    const cookie = await serializeSignedCookie(SESSION_TOKEN_COOKIE, token, ctx.secret, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
    });
    const headers = new Headers({ location: `${origin}/` });
    headers.append("set-cookie", cookie);
    headers.append("set-cookie", clearState(request));
    return new Response(null, { status: 302, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("[pulse] microsoft session", error);
    return back(origin, message === "gesperrt" ? "gesperrt" : "intern");
  }
}

async function readOffice(): Promise<OfficeApp | null> {
  const sql = await getSql();
  const rows = await sql<{ enabled: boolean; secret: string; config: string }>`
    select enabled, secret, config from service_links where id = 'o365' limit 1
  `;
  const row = rows[0];
  if (!row || row.enabled !== true) return null;
  let config: { tenant?: string; clientId?: string } = {};
  try {
    config = JSON.parse(row.config || "{}") as { tenant?: string; clientId?: string };
  } catch {
    return null;
  }
  const tenant = String(config.tenant ?? "").trim();
  const clientId = String(config.clientId ?? "").trim();
  const secret = String(row.secret ?? "").trim();
  if (!/^[\w.-]{3,80}$/.test(tenant) || !/^[\w-]{8,80}$/.test(clientId) || secret.length < 8) return null;
  return { tenant, clientId, secret };
}

async function exchange(
  office: OfficeApp,
  code: string,
  verifier: string,
  uri: string,
): Promise<{ id: string; email: string; name: string }> {
  const body = new URLSearchParams({
    client_id: office.clientId,
    client_secret: office.secret,
    grant_type: "authorization_code",
    code,
    redirect_uri: uri,
    code_verifier: verifier,
    scope: "openid profile email",
  });
  const tokenRes = await fetch(`https://login.microsoftonline.com/${office.tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(8000),
  });
  if (!tokenRes.ok) throw new Error("token");
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) throw new Error("token");
  const infoRes = await fetch("https://graph.microsoft.com/oidc/userinfo", {
    headers: { authorization: `Bearer ${token.access_token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!infoRes.ok) throw new Error("profile");
  const info = (await infoRes.json()) as {
    sub?: string;
    email?: string;
    preferred_username?: string;
    name?: string;
  };
  const email = String(info.email || info.preferred_username || "")
    .trim()
    .toLowerCase();
  const name = String(info.name || email.split("@")[0] || "Team")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return { id: String(info.sub || ""), email, name };
}

async function upsertUser(profile: { id: string; email: string; name: string }): Promise<string> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) throw new Error("mail");
  const sql = await getSql();
  const existing = await sql<{ id: string }>`
    select "id" from "user" where lower("email") = ${profile.email} limit 1
  `;
  let userId = existing[0]?.id ?? "";
  if (!userId) {
    userId = crypto.randomUUID();
    await sql`
      insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
      values (${userId}, ${profile.name || "Team"}, ${profile.email}, true, now(), now())
    `;
  }
  if (profile.id) {
    const linked = await sql<{ id: string }>`
      select "id" from "account" where "providerId" = 'microsoft' and "userId" = ${userId} limit 1
    `;
    if (!linked[0]) {
      await sql`
        insert into "account" ("id", "accountId", "providerId", "userId", "createdAt", "updatedAt")
        values (${crypto.randomUUID()}, ${profile.id}, 'microsoft', ${userId}, now(), now())
      `;
    }
  }
  await sql`
    insert into members (user_id, display_name, role)
    values (${userId}, ${profile.name || "Team"}, 'listener')
    on conflict (user_id) do nothing
  `;
  await sql`
    update members set role = 'admin'
    where user_id = ${userId}
      and not exists (select 1 from members where role = 'admin')
  `;
  const member = await sql<{ disabled: boolean }>`
    select disabled from members where user_id = ${userId} limit 1
  `;
  if (member[0]?.disabled) throw new Error("gesperrt");
  return userId;
}

function back(origin: string, code: string): Response {
  return new Response(null, { status: 302, headers: { location: `${origin}/?microsoft=${code}` } });
}

function stateCookie(state: string, request: Request): string {
  const secure = appOrigin(request).startsWith("https://");
  return `${STATE_COOKIE}=${encodeURIComponent(state)}; Path=/; Max-Age=${STATE_MAX_AGE}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

function clearState(request: Request): string {
  const secure = appOrigin(request).startsWith("https://");
  return `${STATE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

function readCookie(request: Request, name: string): string {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function same(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}
