import { o as __toESM } from "../_runtime.mjs";
import { C as require_jsx_runtime, X as require_react, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as brand } from "./router-Cs-Rb575.mjs";
import { a as Field, c as TopBar, d as errorText, f as fieldClass, g as useHydrated, h as useCurrentUserState, n as AuthSkeleton, o as Panel, p as formatWhen, r as Button, s as StudioIntro, u as cn } from "./pulse-landing-CrPH949W.mjs";
import { C as saveRelaySlot, D as searchMusic, E as saveStation, O as setFallback, T as saveSettings, c as createPlaylist, d as deleteRelaySlot, f as deleteRule, h as getAdmin, i as addPlaylistTrack, k as setMemberRole, l as deletePlaylist, m as generateModeration, n as UserButton, p as deleteStation, s as checkOutput, t as RedirectToSignIn, w as saveRule, x as removePlaylistTrack } from "./api-DQ2avg10.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-C-4Uv4-A.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var sections = [
	{
		id: "ausgabe",
		label: "Ausgabe"
	},
	{
		id: "programm",
		label: "Programm"
	},
	{
		id: "kalender",
		label: "Kalender"
	},
	{
		id: "sender",
		label: "Sender"
	},
	{
		id: "playlists",
		label: "Playlists"
	},
	{
		id: "moderation",
		label: "Moderation"
	},
	{
		id: "team",
		label: "Rollen"
	}
];
function AdminDesk() {
	const [data, setData] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)("");
	const [section, setSection] = (0, import_react.useState)("ausgabe");
	async function load() {
		try {
			setData(await getAdmin());
			setError("");
		} catch (caught) {
			setError(errorText(caught));
		}
	}
	(0, import_react.useEffect)(() => {
		load();
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex min-h-screen w-full max-w-5xl flex-col pb-safe",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TopBar, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/",
				className: "inline-flex h-11 items-center rounded-md px-3 text-sm text-ink",
				children: "Sendung"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/dj",
				className: "inline-flex h-11 items-center rounded-md px-3 text-sm text-ink",
				children: "Pult"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "grid w-full min-w-0 grid-cols-1 gap-4 px-4 pb-10 sm:px-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display text-4xl tracking-tight",
						children: "Regie"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "max-w-2xl text-sm text-muted",
						children: "Lautstärke, Filter und Wünsche gelten für alle. Ein Kalendereintrag überschreibt sie nur für sein Fenster. Farben und Name stehen in der Marken-Datei und lassen sich später auf die Firmen-CI ziehen."
					})]
				}),
				!data && !error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted",
					children: "Regie wird geladen."
				}) : null,
				error && !data ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "Kein Zugang",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: error
					})
				}) : null,
				data ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex gap-2 overflow-x-auto",
						children: sections.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setSection(item.id),
							className: cn("h-11 shrink-0 rounded-md px-4 text-sm", section === item.id ? "bg-signal text-signal-ink" : "bg-surface text-muted"),
							children: item.label
						}, item.id))
					}),
					section === "ausgabe" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OutputForm, {
						initial: data.settings,
						onSaved: setData
					}) : null,
					section === "programm" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProgramForm, {
						initial: data.settings,
						onSaved: setData
					}) : null,
					section === "kalender" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, {
						data,
						onSaved: setData
					}) : null,
					section === "sender" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stations, {
						data,
						onSaved: setData
					}) : null,
					section === "playlists" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Playlists, {
						data,
						onSaved: setData
					}) : null,
					section === "moderation" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moderation, {
						data,
						onSaved: setData
					}) : null,
					section === "team" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Team, {
						data,
						onSaved: setData
					}) : null
				] }) : null
			]
		})]
	});
}
function OutputForm({ initial, onSaved }) {
	const [form, setForm] = (0, import_react.useState)(initial);
	const [status, setStatus] = (0, import_react.useState)("");
	const [pending, setPending] = (0, import_react.useState)(false);
	const external = form.outputTarget !== "browser";
	async function save() {
		setPending(true);
		try {
			onSaved(await saveSettings({ data: form }));
			toast.success("Ausgabe gespeichert.");
		} catch (caught) {
			toast.error(errorText(caught));
		} finally {
			setPending(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
		title: "Wohin der Ton geht",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid gap-2 sm:grid-cols-3",
					children: [
						["browser", "Dieser Browser"],
						["sonos", "Sonos"],
						["receiver", "Receiver"]
					].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setForm({
							...form,
							outputTarget: id
						}),
						className: cn("h-11 rounded-md border border-line px-3 text-sm", form.outputTarget === id ? "bg-signal text-signal-ink" : "bg-surface-2 text-ink"),
						children: label
					}, id))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Browser ist die Sendung an diesem Gerät. Sonos und echte Boxen laufen über denselben kleinen Dienst im Büro-Netz. Der spricht entweder den Sonos-Raum oder den Ausgang am Mini-Server an."
				}),
				external ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Receiver-Adresse",
							hint: "Zum Beispiel http://192.168.1.40:8090",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: fieldClass,
								value: form.receiverUrl,
								onChange: (event) => setForm({
									...form,
									receiverUrl: event.target.value
								})
							})
						}),
						form.outputTarget === "sonos" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Sonos-Raum",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: fieldClass,
								value: form.sonosRoom,
								onChange: (event) => setForm({
									...form,
									sonosRoom: event.target.value
								})
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Sonos-Host, optional",
							hint: "Nur als Notiz für die Bridge. Die Cloud erreicht Sonos nicht direkt.",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: fieldClass,
								value: form.sonosHost,
								onChange: (event) => setForm({
									...form,
									sonosHost: event.target.value
								})
							})
						})] }) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-center gap-3 text-sm text-ink",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								className: "h-5 w-5 accent-signal",
								checked: form.monitorExternal,
								onChange: (event) => setForm({
									...form,
									monitorExternal: event.target.checked
								})
							}), "Zusätzlich in diesem Browser mithören"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
							className: "overflow-x-auto rounded-md bg-canvas p-3 text-xs leading-5 text-muted",
							children: `GET  /v1/health
POST /v1/play    { mode, url, title, artist, text, volume, room, output }
POST /v1/volume  { volume, room, output }`
						})
					]
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: `Lautstärke ${form.volume}`,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "range",
						min: 0,
						max: 100,
						value: form.volume,
						onChange: (event) => setForm({
							...form,
							volume: Number(event.target.value)
						})
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						disabled: pending,
						onClick: () => void save(),
						children: "Speichern"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "line",
						onClick: () => {
							checkOutput().then((result) => setStatus(result.detail)).catch((caught) => setStatus(errorText(caught)));
						},
						children: "Verbindung prüfen"
					})]
				}),
				status ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: status
				}) : null
			]
		})
	});
}
function ProgramForm({ initial, onSaved }) {
	const [form, setForm] = (0, import_react.useState)(initial);
	const [pending, setPending] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
		title: "Was laufen darf",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "grid gap-4",
			onSubmit: (event) => {
				event.preventDefault();
				setPending(true);
				saveSettings({ data: form }).then((next) => {
					onSaved(next);
					toast.success("Programm gespeichert.");
				}).catch((caught) => toast.error(errorText(caught))).finally(() => setPending(false));
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex items-center gap-3 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						className: "h-5 w-5 accent-signal",
						checked: form.wishesEnabled,
						onChange: (event) => setForm({
							...form,
							wishesEnabled: event.target.checked
						})
					}), "Wünsche annehmen"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Filter",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: fieldClass,
						value: form.explicitFilter,
						onChange: (event) => setForm({
							...form,
							explicitFilter: event.target.value
						}),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "allow",
								children: "Alles"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "clean",
								children: "Explicit-Markierung sperren"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "strict",
								children: "Streng, inklusive Begriffsliste"
							})
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Zusätzliche Sperrwörter",
					hint: "Komma oder Zeile. Der strenge Filter nutzt sie zusammen mit einer festen Basisliste.",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						className: "min-h-20 w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal",
						value: form.extraBlocklist,
						onChange: (event) => setForm({
							...form,
							extraBlocklist: event.target.value
						})
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Downvotes bis ein Titel fliegt",
					hint: "Mindestens 2, jede Person stimmt pro Titel nur einmal.",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: fieldClass,
						type: "number",
						min: 2,
						max: 20,
						value: form.downvoteKick,
						onChange: (event) => setForm({
							...form,
							downvoteKick: Number(event.target.value)
						})
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Musikquelle",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
						className: fieldClass,
						value: form.musicSource,
						onChange: (event) => setForm({
							...form,
							musicSource: event.target.value === "spotify" ? "spotify" : event.target.value === "archive" ? "archive" : "preview"
						}),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "preview",
								children: "Vorschau-Katalog, 30 Sekunden"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "archive",
								children: "Internet Archive, ganze Titel, ohne Abo"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "spotify",
								children: "Spotify, Anbindung vorbereitet"
							})
						]
					})
				}),
				form.musicSource === "spotify" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Spotify Client-ID",
					hint: "Ohne abgeschlossene Spotify-Anmeldung bleibt die Suche bewusst aus.",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: fieldClass,
						value: form.spotifyClientId,
						onChange: (event) => setForm({
							...form,
							spotifyClientId: event.target.value
						})
					})
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					disabled: pending,
					children: "Speichern"
				})
			]
		})
	});
}
function Calendar({ data, onSaved }) {
	const [title, setTitle] = (0, import_react.useState)("Townhall");
	const [startsAt, setStartsAt] = (0, import_react.useState)(localInput(60));
	const [endsAt, setEndsAt] = (0, import_react.useState)(localInput(180));
	const [volume, setVolume] = (0, import_react.useState)("");
	const [wishes, setWishes] = (0, import_react.useState)("off");
	const [filter, setFilter] = (0, import_react.useState)("strict");
	const [note, setNote] = (0, import_react.useState)("Offizielle Veranstaltung");
	const [pending, setPending] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "Zeitfenster",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "grid gap-3",
				onSubmit: (event) => {
					event.preventDefault();
					setPending(true);
					saveRule({ data: {
						title,
						startsAt: new Date(startsAt).toISOString(),
						endsAt: new Date(endsAt).toISOString(),
						volume: volume === "" ? null : Number(volume),
						wishesEnabled: wishes === "keep" ? null : wishes === "on",
						explicitFilter: filter === "keep" ? null : filter,
						note
					} }).then((next) => {
						onSaved(next);
						toast.success("Regel liegt im Kalender.");
					}).catch((caught) => toast.error(errorText(caught))).finally(() => setPending(false));
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Name",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: fieldClass,
							value: title,
							onChange: (event) => setTitle(event.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-3 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Beginn",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: fieldClass,
								type: "datetime-local",
								value: startsAt,
								onChange: (event) => setStartsAt(event.target.value)
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Ende",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: fieldClass,
								type: "datetime-local",
								value: endsAt,
								onChange: (event) => setEndsAt(event.target.value)
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-3 sm:grid-cols-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Lautstärke",
								hint: "Leer lässt den Normalwert.",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: fieldClass,
									inputMode: "numeric",
									value: volume,
									onChange: (event) => setVolume(event.target.value)
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Wünsche",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									className: fieldClass,
									value: wishes,
									onChange: (event) => setWishes(event.target.value),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "keep",
											children: "Unverändert"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "on",
											children: "An"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "off",
											children: "Aus"
										})
									]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Filter",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									className: fieldClass,
									value: filter,
									onChange: (event) => setFilter(event.target.value),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "keep",
											children: "Unverändert"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "allow",
											children: "Alles"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "clean",
											children: "Ohne Explicit"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "strict",
											children: "Streng"
										})
									]
								})
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Notiz",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: fieldClass,
							value: note,
							onChange: (event) => setNote(event.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: pending,
						children: "Regel anlegen"
					})
				]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
			title: "Liegt an",
			children: [data.rules.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Noch keine Zeitfenster."
			}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "grid min-w-0 grid-cols-1 gap-3",
				children: data.rules.map((rule) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-medium",
							children: [rule.title, rule.active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "ml-2 text-sm text-ok",
								children: "aktiv"
							}) : null]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-muted",
							children: [
								formatWhen(rule.startsAt),
								" – ",
								formatWhen(rule.endsAt),
								rule.volume != null ? ` · ${rule.volume}` : "",
								rule.wishesEnabled === false ? " · Wünsche aus" : "",
								rule.wishesEnabled === true ? " · Wünsche an" : "",
								rule.explicitFilter ? ` · ${rule.explicitFilter}` : ""
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "danger",
						onClick: () => {
							deleteRule({ data: { id: rule.id } }).then(onSaved).catch((caught) => toast.error(errorText(caught)));
						},
						children: "Entfernen"
					})]
				}, rule.id))
			})]
		})]
	});
}
function Playlists({ data, onSaved }) {
	const [name, setName] = (0, import_react.useState)("");
	const [target, setTarget] = (0, import_react.useState)(data.playlists[0]?.id ?? 0);
	const [query, setQuery] = (0, import_react.useState)("");
	const [hits, setHits] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		if (!data.playlists.some((list) => list.id === target) && data.playlists[0]) setTarget(data.playlists[0].id);
	}, [data.playlists, target]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
			title: "Hausplaylist und weitere",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mb-4 text-sm text-muted",
					children: [
						"Wenn niemand wünscht, läuft die markierte Playlist. ",
						brand.productShort,
						" sucht Titel im Vorschau-Katalog."
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "mb-4 flex gap-2",
					onSubmit: (event) => {
						event.preventDefault();
						createPlaylist({ data: { name } }).then((next) => {
							onSaved(next);
							setName("");
						}).catch((caught) => toast.error(errorText(caught)));
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: fieldClass,
						placeholder: "Neue Playlist",
						value: name,
						onChange: (event) => setName(event.target.value)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: name.trim().length < 2,
						children: "Anlegen"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid gap-4",
					children: data.playlists.map((list) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlaylistCard, {
						list,
						onSaved
					}, list.id))
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
			title: "Titel hinzufügen",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex gap-2",
				onSubmit: (event) => {
					event.preventDefault();
					searchMusic({ data: { query } }).then(setHits).catch((caught) => toast.error(errorText(caught)));
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
						className: fieldClass,
						value: target,
						onChange: (event) => setTarget(Number(event.target.value)),
						children: data.playlists.map((list) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: list.id,
							children: list.name
						}, list.id))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: fieldClass,
						value: query,
						onChange: (event) => setQuery(event.target.value),
						placeholder: "Suchen"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						children: "Suchen"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 grid gap-2",
				children: hits.map((hit) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "min-w-0 truncate text-sm",
						children: [
							hit.title,
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-muted",
								children: ["· ", hit.artist]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "line",
						onClick: () => {
							addPlaylistTrack({ data: {
								playlistId: target,
								track: hit
							} }).then(onSaved).catch((caught) => toast.error(errorText(caught)));
						},
						children: "Dazu"
					})]
				}, `${hit.externalId}-${hit.title}`))
			})]
		})]
	});
}
function PlaylistCard({ list, onSaved }) {
	const [confirm, setConfirm] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: "rounded-lg border border-line p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-2 flex flex-wrap items-center justify-between gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-medium",
				children: list.name
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [list.isFallback ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "inline-flex h-11 items-center text-sm text-ok",
					children: "läuft ohne Wünsche"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "line",
					onClick: () => void setFallback({ data: { id: list.id } }).then(onSaved).catch((e) => toast.error(errorText(e))),
					children: "Als Hausplaylist"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					onClick: () => confirm ? void deletePlaylist({ data: { id: list.id } }).then(onSaved) : setConfirm(true),
					children: confirm ? "Wirklich löschen" : "Löschen"
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
			className: "grid min-w-0 grid-cols-1 gap-1",
			children: [list.tracks.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
				className: "text-sm text-subtle",
				children: "Noch leer."
			}) : null, list.tracks.map((track) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex items-center justify-between gap-3 text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "min-w-0 truncate",
					children: [
						track.title,
						" ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-muted",
							children: ["· ", track.artist]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "h-11 shrink-0 px-2 text-xs text-subtle",
					onClick: () => void removePlaylistTrack({ data: { id: track.id } }).then(onSaved).catch((e) => toast.error(errorText(e))),
					children: "Raus"
				})]
			}, track.id))]
		})]
	});
}
function Moderation({ data, onSaved }) {
	const [form, setForm] = (0, import_react.useState)(data.settings);
	const [immediate, setImmediate] = (0, import_react.useState)(false);
	const [script, setScript] = (0, import_react.useState)("");
	const topics = new Set(form.moderatorTopics.split(",").map((part) => part.trim()).filter(Boolean));
	function toggle(topic) {
		const next = new Set(topics);
		if (next.has(topic)) next.delete(topic);
		else next.add(topic);
		setForm({
			...form,
			moderatorTopics: [...next].join(",")
		});
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
			title: "KI-Moderator",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Zu den Slots spricht eine vorbereitete Moderation. Erzeugen bleibt ein Knopfdruck, damit nichts im Hintergrund Kosten verursacht. Ohne KI-Zugang bleiben die Durchsagen von Hand."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex items-center gap-3 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							className: "h-5 w-5 accent-signal",
							checked: form.moderatorEnabled,
							onChange: (event) => setForm({
								...form,
								moderatorEnabled: event.target.checked
							})
						}), "Slots aktiv"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Uhrzeiten",
						hint: "Zum Beispiel 09:00, 12:30, 16:00",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: fieldClass,
							value: form.moderatorSlots,
							onChange: (event) => setForm({
								...form,
								moderatorSlots: event.target.value
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex flex-wrap gap-2",
						children: [
							"lokal",
							"firma",
							"tech"
						].map((topic) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => toggle(topic),
							className: cn("h-11 rounded-md px-4 text-sm", topics.has(topic) ? "bg-signal text-signal-ink" : "bg-surface-2 text-muted"),
							children: topic
						}, topic))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Firmennotizen",
						hint: "Nur das darf als interne Info vorkommen. Nichts wird dazuerfunden.",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							className: "min-h-24 w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal",
							value: form.companyNotes,
							onChange: (event) => setForm({
								...form,
								companyNotes: event.target.value
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-subtle",
						children: ["Nächster Slot: ", data.nextSlot ? formatWhen(data.nextSlot) : "keiner"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "line",
								onClick: () => {
									saveSettings({ data: form }).then((next) => {
										onSaved(next);
										toast.success("Moderation gespeichert.");
									}).catch((caught) => toast.error(errorText(caught)));
								},
								children: "Einstellungen speichern"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex h-11 items-center gap-2 text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "checkbox",
									className: "h-5 w-5 accent-signal",
									checked: immediate,
									onChange: (event) => setImmediate(event.target.checked)
								}), "Sofort auf Sendung"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								onClick: () => {
									generateModeration({ data: { immediate } }).then(async (result) => {
										if (!result.ok) {
											toast.error(result.error);
											return;
										}
										setScript(result.text);
										onSaved(await getAdmin());
										toast.success(result.airAt ? "Liegt bis zum Slot bereit." : "Moderation läuft.");
									});
								},
								children: "Skript erzeugen"
							})
						]
					}),
					script ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-ink",
						children: script
					}) : null
				]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
			title: "Letzte Ansagen",
			children: [data.announcements.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Noch keine."
			}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "grid min-w-0 grid-cols-1 gap-3",
				children: data.announcements.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "border-t border-line pt-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm font-medium",
						children: [
							item.title,
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-normal text-subtle",
								children: item.status
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: item.body
					})]
				}, item.id))
			})]
		})]
	});
}
function Stations({ data, onSaved }) {
	const [name, setName] = (0, import_react.useState)("");
	const [streamUrl, setStreamUrl] = (0, import_react.useState)("");
	const [note, setNote] = (0, import_react.useState)("");
	const [stationId, setStationId] = (0, import_react.useState)(data.stations[0]?.id ?? 0);
	const [title, setTitle] = (0, import_react.useState)("Nachrichten");
	const [startsAt, setStartsAt] = (0, import_react.useState)(localInput(30));
	const [endsAt, setEndsAt] = (0, import_react.useState)(localInput(45));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
			title: "Echte Sender",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-4 text-sm text-muted",
					children: "Öffentliche https-Streams, zum Beispiel die Nachrichtenschleifen der Öffentlich-Rechtlichen. Der Browser folgt der Umleitung des Senders. YouTube bleibt eine Einbettung und geht nicht an Sonos."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "grid gap-3",
					onSubmit: (event) => {
						event.preventDefault();
						saveStation({ data: {
							name,
							streamUrl,
							note
						} }).then((next) => {
							onSaved(next);
							setName("");
							setStreamUrl("");
							toast.success("Sender liegt bereit.");
						}).catch((caught) => toast.error(errorText(caught)));
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-3 sm:grid-cols-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Name",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: fieldClass,
									value: name,
									onChange: (event) => setName(event.target.value)
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Stream-Adresse",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: fieldClass,
									value: streamUrl,
									placeholder: "https://",
									onChange: (event) => setStreamUrl(event.target.value)
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Notiz",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: fieldClass,
								value: note,
								onChange: (event) => setNote(event.target.value)
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							disabled: name.trim().length < 2 || streamUrl.trim().length < 8,
							children: "Sender anlegen"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-4 grid gap-3",
					children: data.stations.map((station) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
						className: "flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-medium",
								children: station.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-sm text-muted",
								children: station.note || station.streamUrl
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "danger",
							onClick: () => {
								deleteStation({ data: { id: station.id } }).then(onSaved).catch((caught) => toast.error(errorText(caught)));
							},
							children: "Entfernen"
						})]
					}, station.id))
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
			title: "Zeitplan",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "grid gap-3",
				onSubmit: (event) => {
					event.preventDefault();
					saveRelaySlot({ data: {
						stationId,
						title,
						startsAt: new Date(startsAt).toISOString(),
						endsAt: new Date(endsAt).toISOString()
					} }).then((next) => {
						onSaved(next);
						toast.success("Fenster liegt im Plan.");
					}).catch((caught) => toast.error(errorText(caught)));
				},
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Bezeichnung",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							className: fieldClass,
							value: title,
							onChange: (event) => setTitle(event.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Sender",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
							className: fieldClass,
							value: stationId,
							onChange: (event) => setStationId(Number(event.target.value)),
							children: data.stations.map((station) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: station.id,
								children: station.name
							}, station.id))
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-3 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Beginn",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: fieldClass,
								type: "datetime-local",
								value: startsAt,
								onChange: (event) => setStartsAt(event.target.value)
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Ende",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								className: fieldClass,
								type: "datetime-local",
								value: endsAt,
								onChange: (event) => setEndsAt(event.target.value)
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: !stationId || title.trim().length < 2,
						children: "Fenster anlegen"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
				className: "mt-4 grid gap-3",
				children: [data.slots.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
					className: "text-sm text-muted",
					children: "Noch kein Zeitplan."
				}) : null, data.slots.map((slot) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-medium",
						children: [slot.title, slot.active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ml-2 text-sm text-ok",
							children: "aktiv"
						}) : null]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: [
							slot.stationName,
							" · ",
							formatWhen(slot.startsAt),
							" – ",
							formatWhen(slot.endsAt)
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "danger",
						onClick: () => {
							deleteRelaySlot({ data: { id: slot.id } }).then(onSaved).catch((caught) => toast.error(errorText(caught)));
						},
						children: "Entfernen"
					})]
				}, slot.id))]
			})]
		})]
	});
}
function Team({ data, onSaved }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
		title: "Rollen",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-4 text-sm text-muted",
			children: "Hörer wünschen und stimmen ab. DJ hat das Pult: Mikrofon, Aufnahmen, Sender jetzt übernehmen. Regie stellt Programm, Kalender und Rollen."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "grid min-w-0 grid-cols-1 gap-3",
			children: data.members.map((member) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-medium",
					children: member.displayName
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: member.email || roleLabel(member.role)
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
					className: cn(fieldClass, "w-36"),
					value: member.role,
					onChange: (event) => {
						const role = event.target.value;
						if (role !== "admin" && role !== "dj" && role !== "listener") return;
						setMemberRole({ data: {
							userId: member.userId,
							role
						} }).then(onSaved).catch((caught) => toast.error(errorText(caught)));
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "listener",
							children: "Hörer"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "dj",
							children: "DJ"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
							value: "admin",
							children: "Regie"
						})
					]
				})]
			}, member.userId))
		})]
	});
}
function roleLabel(role) {
	if (role === "admin") return "Regie";
	if (role === "dj") return "DJ";
	return "Hörer";
}
function localInput(plusMinutes) {
	const date = new Date(Date.now() + plusMinutes * 6e4);
	const pad = (value) => String(value).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function AdminPage() {
	const { user, isPending } = useCurrentUserState();
	if (!useHydrated() || isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StudioIntro, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthSkeleton, {}) });
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminDesk, {});
}
//#endregion
export { AdminPage as component };
