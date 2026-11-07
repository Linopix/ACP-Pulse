import { o as __toESM } from "../_runtime.mjs";
import { C as require_jsx_runtime, S as useRouter, X as require_react, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as GROK_PROVIDERS } from "./server-DodX5qZI.mjs";
import { n as brand } from "./router-Cs-Rb575.mjs";
import { r as signIn, t as authClient } from "./client-1vAx-gM_.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/pulse-landing-CrPH949W.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Current user + loading state. Same behavior in live preview and when deployed:
*   - Auth enabled -> the real signed-in user; `user` is `null` while
*                            the session resolves (`isPending: true`) and when
*                            signed out (`isPending: false`). Session comes from
*                            Better Auth `useSession()` → `/api/auth/get-session`
*                            (cookie when deployed; bearer in live preview).
*   - Auth disabled (`VITE_AUTH_ENABLED=false`) -> `DEV_USER`, never pending.
*
* Protect a route by waiting out `isPending` before acting on `user` —
* redirecting on `user: null` alone bounces signed-in visitors to sign-in on
* every hard reload:
*
*   import { RedirectToSignIn } from "@/lib/auth/gates";
*   const { user, isPending } = useCurrentUserState();
*   if (isPending) return null;              // still resolving — don't redirect yet
*   if (!user) return <RedirectToSignIn />;  // definitely signed out
*
* `authEnabled` is a module-level constant fixed at load, so the guarded hook
* call keeps a stable hook order across every render of a given component.
*/
function useCurrentUserState() {
	return useSessionUserState();
}
function useSessionUserState() {
	const { data, isPending } = authClient.useSession();
	const id = data?.user.id;
	const displayName = data?.user.name ?? null;
	const primaryEmail = data?.user.email ?? null;
	const profileImageUrl = data?.user.image ?? null;
	const user = (0, import_react.useMemo)(() => id ? {
		id,
		displayName,
		primaryEmail,
		profileImageUrl,
		isDevFallback: false
	} : null, [
		id,
		displayName,
		primaryEmail,
		profileImageUrl
	]);
	return (0, import_react.useMemo)(() => ({
		user,
		isPending
	}), [user, isPending]);
}
/**
* Convenience view of `useCurrentUserState().user` for display (e.g.
* `user?.displayName ?? "Guest"`). NOTE: `null` means *loading OR signed out* —
* for redirects/guards use `useCurrentUserState()` and check `isPending`.
*/
function useCurrentUser() {
	return useCurrentUserState().user;
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function Mark({ className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 32 32",
		className,
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "16",
				cy: "16",
				r: "2.4",
				fill: "currentColor"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M8.5 16c2-3.4 4-3.4 7.5 0s5.5 3.4 7.5 0",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.6",
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M4.5 16c2.8-6 5.6-6 11.5 0s8.7 6 11.5 0",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.6",
				strokeLinecap: "round",
				opacity: "0.45"
			})
		]
	});
}
function TopBar({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "flex items-center justify-between gap-3 px-4 py-4 sm:px-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: "/",
			className: "flex min-w-0 items-center gap-3 text-ink",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, { className: "h-8 w-8 shrink-0 text-signal" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "truncate font-display text-xl leading-none tracking-tight",
				children: brand.productName
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex shrink-0 items-center gap-2 sm:gap-3",
			children
		})]
	});
}
function Button({ variant = "primary", className, type = "button", ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type,
		className: cn("inline-flex h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-transform duration-150 ease-out active:scale-95 disabled:cursor-not-allowed disabled:opacity-40", variant === "primary" && "bg-signal text-signal-ink", variant === "line" && "border border-line bg-surface text-ink", variant === "ghost" && "bg-transparent text-ink", variant === "danger" && "border border-line text-danger", className),
		...props
	});
}
var fieldClass = "h-11 w-full rounded-md border border-line bg-surface-2 px-3 text-sm text-ink outline-none placeholder:text-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";
function Field({ label, children, hint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "grid gap-2 text-sm",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "font-medium text-muted",
				children: label
			}),
			children,
			hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-xs leading-5 text-subtle",
				children: hint
			}) : null
		]
	});
}
function Panel({ title, action, children, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: cn("min-w-0 rounded-xl border border-line bg-surface p-4 sm:p-6", className),
		children: [title ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-4 flex items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl leading-none tracking-tight text-ink",
				children: title
			}), action]
		}) : null, children]
	});
}
function formatWhen(iso) {
	if (!iso) return "";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleString("de-DE", {
		weekday: "short",
		day: "2-digit",
		month: "short",
		hour: "2-digit",
		minute: "2-digit"
	});
}
function clockLabel(now) {
	return new Date(now).toLocaleTimeString("de-DE", {
		hour: "2-digit",
		minute: "2-digit"
	});
}
function errorText(error) {
	if (error instanceof Error && error.message) return error.message;
	return "Das hat nicht geklappt.";
}
function Eq({ live }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "flex h-5 items-end gap-1",
		"aria-hidden": "true",
		children: [
			"h-2",
			"h-4",
			"h-3",
			"h-5"
		].map((height, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("w-1 rounded-sm bg-signal", height, live && "eq-bar"),
			style: live ? { animationDelay: `${index * 120}ms` } : void 0
		}, index))
	});
}
var points = [
	{
		title: "Wünsche",
		text: "Titel in die gemeinsame Queue legen, solange das Programm es erlaubt."
	},
	{
		title: "Faires Voting",
		text: "Upvotes sortieren. Das Kontingent wächst mit der Queue, nie über alle Titel."
	},
	{
		title: "Regie und DJ",
		text: "Kalender, echte Nachrichtensender und ein Mikrofon für Durchsagen."
	}
];
function StudioIntro({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:py-12",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "order-2 grid gap-6 lg:order-1 lg:gap-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3 text-signal",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, { className: "h-9 w-9" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm font-medium tracking-wide text-muted",
						children: [brand.companyName, " Mitarbeiter-Radio"]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display text-5xl leading-none tracking-tight text-ink sm:text-6xl",
						children: brand.productName
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "max-w-md text-lg text-muted",
						children: [brand.tagline, ". Eine Sendung, eine Queue, jedes Gerät hört dasselbe."]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "grid gap-4",
					children: points.map((point) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "grid gap-1 border-t border-line pt-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-medium text-ink",
							children: point.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted",
							children: point.text
						})]
					}, point.title))
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "order-1 w-full lg:order-2",
			children
		})]
	});
}
function useHydrated() {
	const [hydrated, setHydrated] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => setHydrated(true), []);
	return hydrated;
}
function AuthSkeleton() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-8 w-40 animate-pulse rounded-md bg-surface-2" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-11 animate-pulse rounded-md bg-surface-2" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-11 animate-pulse rounded-md bg-surface-2" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-subtle",
				children: "Sendung wird verbunden."
			})
		]
	}) });
}
function AuthCard() {
	const router = useRouter();
	const [mode, setMode] = (0, import_react.useState)("in");
	const [name, setName] = (0, import_react.useState)("");
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [pending, setPending] = (0, import_react.useState)(false);
	async function onSubmit(event) {
		event.preventDefault();
		setError("");
		setPending(true);
		try {
			const result = mode === "up" ? await authClient.signUp.email({
				email: email.trim(),
				password,
				name: name.trim()
			}) : await authClient.signIn.email({
				email: email.trim(),
				password
			});
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
		title: mode === "up" ? "Konto anlegen" : "Anmelden",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: mode === "up" ? "Die erste Person wird Regie. Alle weiteren hören mit und können wünschen." : "Mit dem Firmenkonto in die laufende Sendung."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "grid gap-3",
					onSubmit: (event) => void onSubmit(event),
					children: [
						mode === "up" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: fieldClass,
							placeholder: "Name",
							autoComplete: "name",
							value: name,
							onChange: (event) => setName(event.target.value),
							required: true,
							minLength: 2
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: fieldClass,
							type: "email",
							placeholder: "E-Mail",
							autoComplete: "email",
							value: email,
							onChange: (event) => setEmail(event.target.value),
							required: true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: fieldClass,
							type: "password",
							placeholder: "Passwort, mindestens 8 Zeichen",
							autoComplete: mode === "up" ? "new-password" : "current-password",
							value: password,
							onChange: (event) => setPassword(event.target.value),
							required: true,
							minLength: 8
						}),
						error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-danger",
							role: "alert",
							children: error
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							disabled: pending,
							children: pending ? "Einen Moment" : mode === "up" ? "Konto erstellen" : "Anmelden"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "h-11 text-sm text-muted",
							onClick: () => {
								setMode(mode === "up" ? "in" : "up");
								setError("");
							},
							children: mode === "up" ? "Ich habe schon ein Konto" : "Noch kein Konto"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-subtle",
						children: "oder"
					}), GROK_PROVIDERS.map((provider) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "line",
						onClick: () => void signIn(provider.providerId, { callbackURL: "/" }),
						children: ["Weiter mit ", provider.label]
					}, provider.providerId))]
				})
			]
		})
	});
}
function localAuthError(message) {
	const text = message.toLowerCase();
	if (text.includes("exist") || text.includes("already")) return "Zu dieser Adresse gibt es schon ein Konto.";
	if (text.includes("password")) return "Das Passwort muss mindestens 8 Zeichen haben.";
	if (text.includes("invalid") || text.includes("credential")) return "E-Mail oder Passwort passt nicht.";
	if (text.includes("origin")) return "Anmeldung von dieser Adresse ist nicht erlaubt.";
	return message || "Anmeldung fehlgeschlagen.";
}
//#endregion
export { Field as a, TopBar as c, errorText as d, fieldClass as f, useHydrated as g, useCurrentUserState as h, Eq as i, clockLabel as l, useCurrentUser as m, AuthSkeleton as n, Panel as o, formatWhen as p, Button as r, StudioIntro as s, AuthCard as t, cn as u };
