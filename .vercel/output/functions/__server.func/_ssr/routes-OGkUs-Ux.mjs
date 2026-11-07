import { o as __toESM } from "../_runtime.mjs";
import { C as require_jsx_runtime, X as require_react, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { c as TopBar, d as errorText, f as fieldClass, g as useHydrated, h as useCurrentUserState, i as Eq, l as clockLabel, n as AuthSkeleton, o as Panel, p as formatWhen, r as Button, s as StudioIntro, t as AuthCard, u as cn } from "./pulse-landing-CrPH949W.mjs";
import { a as isDesk } from "./logic-Boooy6fK.mjs";
import { A as skipTrack, D as searchMusic, M as withdrawWish, a as addWish, b as postAnnouncement, g as getClip, n as UserButton, o as castVote, v as getStation } from "./api-DQ2avg10.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-OGkUs-Ux.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var filters = {
	allow: "Alles erlaubt",
	clean: "Ohne Explicit",
	strict: "Strenger Filter"
};
function Station() {
	const [snap, setSnap] = (0, import_react.useState)(null);
	const [failed, setFailed] = (0, import_react.useState)("");
	const now = useClock();
	const refresh = (0, import_react.useCallback)(async () => {
		try {
			const next = await getStation();
			setSnap(next);
			setFailed("");
		} catch (error) {
			setFailed(errorText(error));
		}
	}, []);
	(0, import_react.useEffect)(() => {
		refresh();
		const id = window.setInterval(() => void refresh(), 3e3);
		return () => window.clearInterval(id);
	}, [refresh]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto flex min-h-screen w-full max-w-6xl flex-col pb-safe",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TopBar, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "hidden text-sm tabular-nums text-muted sm:inline",
				children: clockLabel(now)
			}),
			snap && isDesk(snap.me.role) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/dj",
				className: "inline-flex h-11 items-center rounded-md px-3 text-sm font-medium text-ink",
				children: "Pult"
			}) : null,
			snap?.me.role === "admin" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/admin",
				className: "inline-flex h-11 items-center rounded-md px-3 text-sm font-medium text-ink",
				children: "Regie"
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "grid w-full min-w-0 grid-cols-1 gap-4 px-4 pb-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem]",
			children: [
				!snap && !failed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted",
					children: "Sendung wird geladen."
				}) : null,
				failed && !snap ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
					title: "Keine Verbindung",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: failed
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "mt-4",
						onClick: () => void refresh(),
						children: "Nochmal"
					})]
				}) : null,
				snap ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid min-w-0 grid-cols-1 content-start gap-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Banners, { snap }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NowPlaying, {
							snap,
							now,
							onSkip: () => run(() => skipTrack(), setSnap)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Queue, {
							snap,
							onChange: setSnap
						}),
						snap.history.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
							title: "Zuletzt",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "grid min-w-0 grid-cols-1 gap-2",
								children: snap.history.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "flex items-baseline justify-between gap-3 text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "min-w-0 truncate text-ink",
										children: [item.title, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-muted",
											children: [" · ", item.artist]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "shrink-0 tabular-nums text-subtle",
										children: formatWhen(item.at)
									})]
								}, `${item.at}-${item.title}`))
							})
						}) : null
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid min-w-0 grid-cols-1 content-start gap-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							snap,
							onAdded: setSnap
						}),
						isDesk(snap.me.role) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Announce, { onAir: setSnap }) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "px-1 text-xs leading-5 text-subtle",
							children: [
								"Ausgabe: ",
								snap.outputLabel,
								". Vorschau etwa 30 Sekunden, ganze Titel aus dem Archiv ohne Abo. YouTube nur im Browser. Echte Sender übernimmt das Pult nach Zeitplan."
							]
						})
					]
				})] }) : null
			]
		})]
	});
}
function Banners({ snap }) {
	if (!snap.activeRule && snap.wishesEnabled && !snap.relay) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-2",
		children: [
			snap.activeRule ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-medium text-ink",
						children: snap.activeRule.title
					}),
					" bis ",
					formatWhen(snap.activeRule.endsAt),
					snap.activeRule.note ? ` · ${snap.activeRule.note}` : ""
				]
			}) : null,
			!snap.wishesEnabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-lg border border-line px-4 py-3 text-sm text-ink",
				children: "Wünsche sind gerade geschlossen."
			}) : null,
			snap.relay && snap.now.mode !== "relay" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-medium text-ink",
						children: snap.relay.stationName
					}),
					" bis ",
					formatWhen(snap.relay.endsAt),
					snap.now.mode === "announcement" ? " · danach wieder der Sender" : ""
				]
			}) : null
		]
	});
}
function NowPlaying({ snap, now, onSkip }) {
	const air = snap.now;
	const progress = air.startedAt ? Math.min(1, Math.max(0, (now - new Date(air.startedAt).getTime()) / Math.max(1, air.durationMs))) : 0;
	const audible = snap.outputTarget === "browser" || snap.monitorExternal;
	const player = useAir(air, audible, snap.volume);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid w-full min-w-0 grid-cols-1 gap-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cover, {
			url: air.artworkUrl,
			title: air.title,
			live: air.mode !== "idle",
			youtubeId: air.youtubeId,
			startAt: air.startedAt,
			armed: player.ytArmed
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid min-w-0 gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3 text-sm text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eq, { live: air.mode !== "idle" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: air.via }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-subtle",
							children: filters[snap.explicitFilter]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "truncate font-display text-4xl leading-none tracking-tight",
						children: air.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "truncate text-muted",
						children: air.subtitle
					})]
				}),
				air.mode === "announcement" && air.announcementBody ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-ink",
					children: air.announcementBody
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-1 overflow-hidden rounded-sm bg-surface-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-full bg-signal",
						style: { width: `${Math.round(progress * 100)}%` }
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-sm tabular-nums text-subtle",
							children: ["Lautstärke ", snap.volume]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "line",
							onClick: () => player.setMuted((value) => !value),
							children: player.muted ? "Ton an" : "Leise hier"
						}),
						player.blocked && audible ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: () => void player.start(),
							children: "Sendung hören"
						}) : null,
						isDesk(snap.me.role) && air.mode !== "idle" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							onClick: onSkip,
							children: "Überspringen"
						}) : null
					]
				}),
				air.youtubeId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-subtle",
					children: "YouTube läuft nur hier im Browser, nicht über Sonos oder den Receiver."
				}) : null,
				air.live ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-subtle",
					children: "Livestream des Senders, ohne Vorspulen."
				}) : null,
				!audible ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs text-subtle",
					children: [
						"Musik geht an ",
						snap.outputLabel,
						". Dieser Bildschirm zeigt nur mit."
					]
				}) : null
			]
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("audio", {
		ref: player.audioRef,
		preload: "auto",
		className: "sr-only"
	})] });
}
function Cover({ url, title, live, youtubeId, startAt, armed }) {
	const start = startAt ? Math.max(0, Math.floor((Date.now() - new Date(startAt).getTime()) / 1e3)) : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative aspect-square w-full min-w-0 max-w-full overflow-hidden rounded-md bg-surface-2",
		children: [
			youtubeId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("iframe", {
				title,
				src: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&start=${start}${armed ? "&autoplay=1" : ""}`,
				allow: "autoplay; encrypted-media",
				className: "h-full max-h-full w-full max-w-full"
			}, `${youtubeId}-${armed ? "on" : "off"}`) : null,
			url && !youtubeId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: url,
				alt: "",
				className: "h-full max-h-full w-full max-w-full min-w-0 object-cover"
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: cn("absolute inset-0 grid place-items-center", (url || youtubeId) && "hidden"),
				children: !url && !youtubeId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "px-4 text-center font-display text-2xl text-muted",
					children: live ? title : "Pulse"
				}) : null
			})
		]
	});
}
function Queue({ snap, onChange }) {
	const { budget } = snap;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
		title: "Queue",
		action: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "text-xs tabular-nums text-subtle",
			children: [
				budget.upUsed,
				"/",
				budget.up,
				" hoch · ",
				budget.downUsed,
				"/",
				budget.down,
				" runter"
			]
		}),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mb-4 text-sm text-muted",
			children: [
				"Reihenfolge nach Upvotes. Bei ",
				snap.queue.length === 1 ? "einem Titel" : `${snap.queue.length} Titeln`,
				" gibt es",
				" ",
				budget.up,
				" ",
				budget.up === 1 ? "Upvote" : "Upvotes",
				" — nicht genug, um alles nach oben zu schieben. Ab",
				" ",
				snap.downvoteKick,
				" Downvotes und mehr Gegenstimmen als Zustimmung fliegt ein Titel raus."
			]
		}), snap.queue.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-sm text-muted",
			children: [
				"Keine Wünsche. Es läuft ",
				snap.fallbackName,
				"."
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "grid min-w-0 grid-cols-1 gap-2",
			children: snap.queue.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueueRow, {
				item,
				index,
				snap,
				onChange
			}, item.id))
		})]
	});
}
function QueueRow({ item, index, snap, onChange }) {
	const upFull = snap.budget.upUsed >= snap.budget.up && item.myVote !== 1;
	const downFull = snap.budget.downUsed >= snap.budget.down && item.myVote !== -1;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg bg-surface-2 p-2 sm:p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "w-6 text-center text-sm tabular-nums text-subtle",
				children: index + 1
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "truncate font-medium text-ink",
					children: item.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "truncate text-sm text-muted",
					children: [
						item.artist,
						" · ",
						item.mine ? "dein Wunsch" : item.addedByName,
						item.blocked ? " · Filter hält ihn zurück" : ""
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VoteButton, {
						label: "Hoch",
						pressed: item.myVote === 1,
						disabled: item.mine || upFull && item.myVote !== 1,
						onClick: () => void vote(item, item.myVote === 1 ? 0 : 1, onChange)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "w-8 text-center text-sm tabular-nums text-ink",
						children: item.score
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VoteButton, {
						label: "Runter",
						pressed: item.myVote === -1,
						disabled: item.mine || downFull && item.myVote !== -1,
						onClick: () => void vote(item, item.myVote === -1 ? 0 : -1, onChange)
					}),
					item.mine || isDesk(snap.me.role) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "h-11 px-2 text-xs text-subtle",
						onClick: () => void run(() => withdrawWish({ data: { id: item.id } }), onChange),
						children: "Weg"
					}) : null
				]
			})
		]
	});
}
function VoteButton({ label, pressed, disabled, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		"aria-pressed": pressed,
		"aria-label": label,
		disabled,
		onClick,
		className: cn("h-11 w-11 rounded-md text-sm font-medium disabled:opacity-30", pressed ? "bg-signal text-signal-ink" : "bg-canvas text-muted"),
		children: label === "Hoch" ? "↑" : "↓"
	});
}
function Search({ snap, onAdded }) {
	const [query, setQuery] = (0, import_react.useState)("");
	const [catalog, setCatalog] = (0, import_react.useState)(snap.musicSource === "preview" ? "preview" : "archive");
	const [hits, setHits] = (0, import_react.useState)([]);
	const [pending, setPending] = (0, import_react.useState)(false);
	async function onSearch(event) {
		event.preventDefault();
		setPending(true);
		try {
			setHits(await searchMusic({ data: {
				query,
				catalog
			} }));
		} catch (error) {
			toast.error(errorText(error));
		} finally {
			setPending(false);
		}
	}
	const closed = !snap.wishesEnabled;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
		title: "Wunsch",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mb-3 text-sm text-muted",
				children: [
					snap.openWishes,
					"/",
					3,
					" offene Wünsche von dir."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-3 flex gap-2",
				children: [["preview", "30s Vorschau"], ["archive", "Ganze Titel"]].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => setCatalog(id),
					className: cn("h-11 rounded-md px-3 text-sm", catalog === id ? "bg-signal text-signal-ink" : "bg-surface-2 text-muted"),
					children: label
				}, id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex gap-2",
				onSubmit: (event) => void onSearch(event),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: fieldClass,
					value: query,
					placeholder: catalog === "archive" ? "Titel aus dem Archiv, ohne Abo" : "Song oder Interpret",
					onChange: (event) => setQuery(event.target.value),
					disabled: closed
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					disabled: closed || pending || query.trim().length < 2,
					children: pending ? "…" : "Suchen"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-3 grid gap-2",
				children: hits.map((hit) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-sm font-medium",
							children: hit.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "truncate text-xs text-muted",
							children: [
								hit.artist,
								hit.durationMs > 35e3 ? ` · ${clock(hit.durationMs)}` : "",
								hit.explicit ? " · explicit" : ""
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "line",
						disabled: closed,
						onClick: () => void run(() => addWish({ data: hit }), onAdded, "In der Queue."),
						children: "Dazu"
					})]
				}, `${hit.externalId}-${hit.title}`))
			})
		]
	});
}
function Announce({ onAir }) {
	const [title, setTitle] = (0, import_react.useState)("Durchsage");
	const [body, setBody] = (0, import_react.useState)("");
	const [pending, setPending] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
		title: "Durchsage",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "grid gap-3",
			onSubmit: (event) => {
				event.preventDefault();
				setPending(true);
				run(() => postAnnouncement({ data: {
					title,
					body
				} }), onAir, "Durchsage läuft.").finally(() => {
					setPending(false);
					setBody("");
				});
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: fieldClass,
					value: title,
					onChange: (event) => setTitle(event.target.value)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					className: "min-h-24 w-full rounded-md border border-line bg-surface-2 px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal",
					placeholder: "Kurzer Text, der die Musik unterbricht.",
					value: body,
					onChange: (event) => setBody(event.target.value)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "submit",
					disabled: pending || body.trim().length < 8,
					children: "Jetzt sprechen"
				})
			]
		})
	});
}
function useClock() {
	const [now, setNow] = (0, import_react.useState)(() => Date.now());
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => setNow(Date.now()), 250);
		return () => window.clearInterval(id);
	}, []);
	return now;
}
function useAir(air, audible, volume) {
	const audioRef = (0, import_react.useRef)(null);
	const sig = (0, import_react.useRef)("");
	const [muted, setMuted] = (0, import_react.useState)(false);
	const [blocked, setBlocked] = (0, import_react.useState)(false);
	const [ytArmed, setYtArmed] = (0, import_react.useState)(false);
	const start = (0, import_react.useCallback)(async () => {
		const audio = audioRef.current;
		setBlocked(false);
		setYtArmed(true);
		if (air.youtubeId) return;
		if (air.mode === "announcement" && air.recordingId) {
			await playClip(air.recordingId, audio, setBlocked);
			return;
		}
		if (air.mode === "announcement" && air.announcementBody && audible && !muted) speak(air.announcementBody);
		if (!audio || !air.audioUrl || !audible || air.mode === "announcement") return;
		try {
			await audio.play();
			seek(audio, air.startedAt, air.live);
		} catch {
			setBlocked(true);
		}
	}, [
		air,
		audible,
		muted
	]);
	(0, import_react.useEffect)(() => {
		const audio = audioRef.current;
		if (!audio) return;
		audio.volume = muted ? 0 : Math.min(1, Math.max(0, volume / 100));
	}, [
		muted,
		volume,
		air.key
	]);
	(0, import_react.useEffect)(() => {
		const audio = audioRef.current;
		if (!audio) return;
		const next = `${air.key}|${audible}|${muted}`;
		if (sig.current === next) return;
		sig.current = next;
		window.speechSynthesis?.cancel();
		if (air.youtubeId) {
			audio.pause();
			setBlocked(true);
			setYtArmed(false);
			return;
		}
		if (!audible || muted) {
			audio.pause();
			return;
		}
		if (air.mode === "announcement" && air.recordingId) {
			playClip(air.recordingId, audio, setBlocked);
			return;
		}
		if (air.mode === "announcement") {
			audio.pause();
			if (air.announcementBody) speak(air.announcementBody);
			return;
		}
		if (!air.audioUrl) {
			audio.pause();
			return;
		}
		audio.src = air.audioUrl;
		audio.play().then(() => {
			seek(audio, air.startedAt, air.live);
			setBlocked(false);
		}).catch(() => setBlocked(true));
	}, [
		air,
		audible,
		muted
	]);
	return {
		audioRef,
		blocked,
		muted,
		setMuted,
		start,
		ytArmed
	};
}
function seek(audio, startedAt, live) {
	if (live || !startedAt) return;
	const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1e3;
	if (Number.isFinite(audio.duration) && elapsed > 0 && elapsed < audio.duration) audio.currentTime = elapsed;
}
async function playClip(id, audio, setBlocked) {
	if (!audio) return;
	try {
		const clip = await getClip({ data: { id } });
		audio.src = `data:${clip.mime};base64,${clip.audioBase64}`;
		await audio.play();
		setBlocked(false);
	} catch {
		setBlocked(true);
	}
}
function clock(ms) {
	const total = Math.max(0, Math.round(ms / 1e3));
	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
function speak(text) {
	if (typeof window === "undefined" || !window.speechSynthesis) return;
	const utter = new SpeechSynthesisUtterance(text);
	utter.lang = "de-DE";
	utter.rate = 1;
	const voice = window.speechSynthesis.getVoices().find((item) => item.lang.toLowerCase().startsWith("de"));
	if (voice) utter.voice = voice;
	window.speechSynthesis.speak(utter);
}
async function vote(item, value, onChange) {
	await run(() => castVote({ data: {
		id: item.id,
		value
	} }), onChange);
}
async function run(action, onChange, ok) {
	try {
		onChange(await action());
		if (ok) toast.success(ok);
	} catch (error) {
		toast.error(errorText(error));
	}
}
function Home() {
	const { user, isPending } = useCurrentUserState();
	const hydrated = useHydrated();
	if (!hydrated || isPending || !user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StudioIntro, { children: !hydrated || isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthSkeleton, {}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthCard, {}) });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Station, {});
}
//#endregion
export { Home as component };
