/**
 * Spotify-Konto der Sendung. Authorization Code mit PKCE.
 * Kein Passwort in Pulse. Der Refresh bleibt in service_links.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getSql } from "@/lib/db";
import { auth } from "@/lib/auth/server";
import { appOrigin } from "@/lib/pulse/microsoft";

const STATE_COOKIE = "pulse-sp";
const STATE_MAX_AGE = 600;
const SCOPES = "user-read-private user-read-email";

export function spotifyRedirectUri(origin: string): string {
  return `${origin}/api/spotify/callback`;
}

export async function beginSpotify(request: Request): Promise<Response> {
  const origin = appOrigin(request);
  const session = await auth.api.getSession({ headers: request.headers });
  const userId = session?.user?.id ?? "";
  if (!userId) return back(origin, "login");
  const sql = await getSql();
  const member = await sql<{ role: string }>`select role from members where user_id = ${userId} limit 1`;
  const role = String(member[0]?.role ?? "");
  if (role !== "admin" && role !== "dj") return back(origin, "recht");
  const app = await readSpotifyApp(sql);
  if (!app) return back(origin, "fehlt");
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const id = crypto.randomUUID();
  await sql`delete from "verification" where "identifier" like 'sp:%' and "expiresAt" < now()`;
  await sql`
    insert into "verification" ("id", "identifier", "value", "expiresAt", "createdAt", "updatedAt")
    values (${id}, ${`sp:${state}`}, ${verifier}, now() + interval '10 minutes', now(), now())
  `;
  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("client_id", app.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", spotifyRedirectUri(origin));
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("show_dialog", "true");
  const headers = new Headers({ location: url.toString() });
  headers.append("set-cookie", stateCookie(state, request));
  return new Response(null, { status: 302, headers });
}

export async function finishSpotify(request: Request): Promise<Response> {
  const origin = appOrigin(request);
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code") ?? "";
  const cookieState = readCookie(request, STATE_COOKIE);
  if (!state || !code || !same(state, cookieState)) return back(origin, "state");
  const sql = await getSql();
  const rows = await sql<{ value: string }>`
    delete from "verification"
    where "identifier" = ${`sp:${state}`} and "expiresAt" > now()
    returning "value"
  `;
  const verifier = rows[0]?.value ?? "";
  if (!verifier) return back(origin, "state");
  const app = await readSpotifyApp(sql);
  if (!app) return back(origin, "fehlt");
  try {
    const linked = await exchange(app, code, verifier, spotifyRedirectUri(origin));
    const detail = `Verbunden als ${linked.name}. Die Sendung bleibt in allen Browsern gleich.`;
    const config = JSON.stringify({
      clientId: app.clientId,
      refreshToken: linked.refreshToken,
      accountName: linked.name,
    });
    await sql`
      insert into service_links (id, enabled, detail, config)
      values ('spotify', true, ${detail}, ${config})
      on conflict (id) do update set
        enabled = true,
        detail = excluded.detail,
        config = excluded.config,
        updated_at = now()
    `;
  } catch (error) {
    console.error("[pulse] spotify", error);
    return back(origin, "token");
  }
  const headers = new Headers({ location: `${origin}/admin?spotify=ok` });
  headers.append("set-cookie", clearState(request));
  return new Response(null, { status: 302, headers });
}

type SpotifyApp = { clientId: string; secret: string };

async function readSpotifyApp(sql: Awaited<ReturnType<typeof getSql>>): Promise<SpotifyApp | null> {
  const rows = await sql<{ secret: string; config: string }>`
    select secret, config from service_links where id = 'spotify' limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  let clientId = "";
  try {
    const config = JSON.parse(row.config || "{}") as { clientId?: string };
    clientId = String(config.clientId ?? "").replace(/[^\w-]/g, "");
  } catch {
    return null;
  }
  if (!/^[\w-]{8,80}$/.test(clientId)) return null;
  return { clientId, secret: String(row.secret ?? "").trim() };
}

async function exchange(
  app: SpotifyApp,
  code: string,
  verifier: string,
  uri: string,
): Promise<{ name: string; refreshToken: string }> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: uri,
    client_id: app.clientId,
    code_verifier: verifier,
  });
  if (app.secret) body.set("client_secret", app.secret);
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(8000),
  });
  if (!tokenRes.ok) throw new Error("token");
  const token = (await tokenRes.json()) as { access_token?: string; refresh_token?: string };
  if (!token.access_token || !token.refresh_token) throw new Error("token");
  const infoRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { authorization: `Bearer ${token.access_token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!infoRes.ok) throw new Error("profile");
  const info = (await infoRes.json()) as { display_name?: string; id?: string };
  const name = String(info.display_name || info.id || "Spotify")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return { name, refreshToken: token.refresh_token.slice(0, 512) };
}

function back(origin: string, code: string): Response {
  return new Response(null, { status: 302, headers: { location: `${origin}/admin?spotify=${code}` } });
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
