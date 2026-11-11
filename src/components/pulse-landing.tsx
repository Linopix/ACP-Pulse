import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { brand } from "@/brand";
import { GROK_PROVIDERS, authClient, signIn } from "@/lib/auth/client";
import { emailAndPasswordEnabled } from "@/lib/auth/email-password";
import { Button, Field, Mark, Panel, fieldClass } from "@/components/pulse-ui";

const points = [
  { title: "Wünsche", text: "Titel in die gemeinsame Queue legen, solange das Programm es erlaubt." },
  { title: "Faires Voting", text: "Upvotes sortieren. Das Kontingent wächst mit der Queue, nie über alle Titel." },
  { title: "Regie und DJ", text: "Kalender, echte Nachrichtensender und ein Mikrofon für Durchsagen." },
];

export function StudioIntro({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:py-12">
      <div className="rise order-2 grid gap-6 lg:order-1 lg:gap-8">
        <div className="flex items-center gap-3 text-signal">
          <Mark className="h-9 w-9" />
          <p className="text-sm font-medium tracking-wide text-muted">{brand.companyName} Mitarbeiter-Radio</p>
        </div>
        <div className="grid gap-4">
          <h1 className="font-display text-5xl leading-none tracking-tight text-ink sm:text-6xl">
            {brand.productName}
          </h1>
          <p className="max-w-md text-lg text-muted">{brand.tagline}. Eine Sendung, eine Queue, jedes Gerät hört dasselbe.</p>
        </div>
        <ul className="grid gap-4">
          {points.map((point) => (
            <li key={point.title} className="grid gap-1 border-t border-line pt-4">
              <p className="font-medium text-ink">{point.title}</p>
              <p className="text-sm text-muted">{point.text}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="order-1 w-full lg:order-2">{children}</div>
    </main>
  );
}

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

export function AuthSkeleton() {
  return (
    <Panel>
      <div className="grid gap-4">
        <div className="h-8 w-40 animate-pulse rounded-md bg-surface-2" />
        <div className="h-11 animate-pulse rounded-md bg-surface-2" />
        <div className="h-11 animate-pulse rounded-md bg-surface-2" />
        <p className="text-sm text-subtle">Sendung wird verbunden.</p>
      </div>
    </Panel>
  );
}

export function AuthCard() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("microsoft");
    if (!code) return;
    setNotice(microsoftNotice(code));
    const url = new URL(window.location.href);
    url.searchParams.delete("microsoft");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const result =
        mode === "up"
          ? await authClient.signUp.email({ email: email.trim(), password, name: name.trim() })
          : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) {
        setError(localAuthError(result.error.message ?? ""));
        return;
      }
      await router.invalidate();
      await router.navigate({ to: "/" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel title={mode === "up" ? "Konto anlegen" : "Anmelden"}>
      <div className="grid gap-5">
        <p className="text-sm text-muted">
          {mode === "up"
            ? "Die erste Person wird Regie. Alle weiteren hören mit und können wünschen."
            : "Mit dem Firmenkonto in die laufende Sendung."}
        </p>
        {notice ? (
          <p className="text-sm text-danger" role="alert">
            {notice}
          </p>
        ) : null}
        {emailAndPasswordEnabled ? (
          <form className="grid gap-3" onSubmit={(event) => void onSubmit(event)}>
            {mode === "up" ? (
              <Field label="Name">
                <input
                  className={fieldClass}
                  placeholder="Wie dich das Team sieht"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  minLength={2}
                />
              </Field>
            ) : null}
            <Field label="E-Mail">
              <input
                className={fieldClass}
                type="email"
                placeholder="name@firma.de"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>
            <Field label="Passwort" hint="Mindestens 8 Zeichen.">
              <input
                className={fieldClass}
                type="password"
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </Field>
            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Einen Moment" : mode === "up" ? "Konto erstellen" : "Anmelden"}
            </Button>
            <button
              type="button"
              className="h-11 text-sm text-muted"
              onClick={() => {
                setMode(mode === "up" ? "in" : "up");
                setError("");
              }}
            >
              {mode === "up" ? "Ich habe schon ein Konto" : "Noch kein Konto"}
            </button>
          </form>
        ) : null}
        <div className="grid gap-2">
          {emailAndPasswordEnabled ? <p className="text-xs text-subtle">oder</p> : null}
          <Button variant="line" onClick={() => window.location.assign("/api/microsoft/start")}>
            Mit Microsoft anmelden
          </Button>
          {GROK_PROVIDERS.map((provider) => (
            <Button
              key={provider.providerId}
              variant="line"
              onClick={() => void signIn(provider.providerId, { callbackURL: "/" })}
            >
              Weiter mit {provider.label}
            </Button>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function localAuthError(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("exist") || text.includes("already")) return "Zu dieser Adresse gibt es schon ein Konto.";
  if (text.includes("origin")) return "Anmeldung von dieser Adresse ist nicht erlaubt.";
  if (text.includes("password")) return "Das Passwort muss mindestens 8 Zeichen haben.";
  if (text.includes("invalid") || text.includes("credential")) return "E-Mail oder Passwort passt nicht.";
  return message || "Anmeldung fehlgeschlagen.";
}

function microsoftNotice(code: string): string {
  if (code === "fehlt") return "Microsoft ist in der Regie noch nicht eingeschaltet. Mandant, Client-ID und Geheimnis fehlen.";
  if (code === "state") return "Die Microsoft-Anmeldung ist abgelaufen. Bitte erneut.";
  if (code === "token") return "Microsoft hat die Anmeldung abgelehnt. Redirect-URI und Geheimnis prüfen.";
  if (code === "mail") return "Microsoft hat keine E-Mail-Adresse geliefert.";
  if (code === "gesperrt") return "Dieses Konto ist gesperrt.";
  return "Anmeldung über Microsoft ist gerade nicht möglich.";
}
