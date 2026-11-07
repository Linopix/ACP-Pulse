import { o as __toESM } from "../_runtime.mjs";
import { C as require_jsx_runtime, X as require_react, b as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as Field, c as TopBar, d as errorText, f as fieldClass, g as useHydrated, h as useCurrentUserState, n as AuthSkeleton, o as Panel, p as formatWhen, r as Button, s as StudioIntro } from "./pulse-landing-CrPH949W.mjs";
import { S as saveRecording, _ as getDesk, g as getClip, j as startRelayNow, n as UserButton, r as addExternal, t as RedirectToSignIn, u as deleteRecording, y as playRecording } from "./api-DQ2avg10.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dj-Dp4n_wYf.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Desk() {
	const [data, setData] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)("");
	async function load() {
		try {
			setData(await getDesk());
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
			data?.me.role === "admin" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/admin",
				className: "inline-flex h-11 items-center rounded-md px-3 text-sm text-ink",
				children: "Regie"
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserButton, {})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
			className: "grid w-full min-w-0 grid-cols-1 gap-4 px-4 pb-10 sm:px-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display text-4xl tracking-tight",
						children: "Pult"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "max-w-2xl text-sm text-muted",
						children: "Mikrofon und Aufnahmen unterbrechen die Musik. Sender können sofort oder nach dem Zeitplan aus der Regie übernehmen."
					})]
				}),
				!data && !error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted",
					children: "Pult wird geladen."
				}) : null,
				error && !data ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
					title: "Kein Zugang",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: error
					})
				}) : null,
				data ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { onSaved: setData }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Recordings, {
						data,
						onSaved: setData
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RelayNow, {
						data,
						onSaved: setData
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cue, {})
				] }) : null
			]
		})]
	});
}
function Mic({ onSaved }) {
	const [recording, setRecording] = (0, import_react.useState)(false);
	const [seconds, setSeconds] = (0, import_react.useState)(0);
	const [title, setTitle] = (0, import_react.useState)("Durchsage");
	const [blob, setBlob] = (0, import_react.useState)(null);
	const [preview, setPreview] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [pending, setPending] = (0, import_react.useState)(false);
	const recorder = (0, import_react.useRef)(null);
	const timer = (0, import_react.useRef)(0);
	const started = (0, import_react.useRef)(0);
	(0, import_react.useEffect)(() => () => window.clearInterval(timer.current), []);
	async function begin() {
		setError("");
		setBlob(null);
		if (preview) URL.revokeObjectURL(preview);
		setPreview("");
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mime = [
				"audio/webm;codecs=opus",
				"audio/webm",
				"audio/mp4"
			].find((item) => MediaRecorder.isTypeSupported(item));
			const media = new MediaRecorder(stream, mime ? { mimeType: mime } : void 0);
			const chunks = [];
			media.ondataavailable = (event) => {
				if (event.data.size > 0) chunks.push(event.data);
			};
			media.onstop = () => {
				stream.getTracks().forEach((track) => track.stop());
				const next = new Blob(chunks, { type: media.mimeType || "audio/webm" });
				setBlob(next);
				setPreview(URL.createObjectURL(next));
				setSeconds(Math.min(45, Math.max(1, Math.round((Date.now() - started.current) / 1e3))));
			};
			recorder.current = media;
			started.current = Date.now();
			media.start();
			setRecording(true);
			setSeconds(0);
			window.clearInterval(timer.current);
			timer.current = window.setInterval(() => {
				const elapsed = Math.floor((Date.now() - started.current) / 1e3);
				setSeconds(elapsed);
				if (elapsed >= 45) media.stop();
			}, 250);
		} catch {
			setError("Mikrofon nicht verfügbar. Im Browser die Freigabe erlauben.");
		}
	}
	function stop() {
		window.clearInterval(timer.current);
		recorder.current?.stop();
		recorder.current = null;
		setRecording(false);
	}
	async function store(air) {
		if (!blob) return;
		setPending(true);
		try {
			const audioBase64 = await blobToBase64(blob);
			onSaved(await saveRecording({ data: {
				title,
				mime: blob.type || "audio/webm",
				audioBase64,
				durationMs: Math.max(1e3, seconds * 1e3),
				air
			} }));
			setBlob(null);
			if (preview) URL.revokeObjectURL(preview);
			setPreview("");
			toast.success(air ? "Durchsage läuft." : "Aufnahme liegt im Pult.");
		} catch (caught) {
			toast.error(errorText(caught));
		} finally {
			setPending(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Panel, {
		title: "Mikrofon",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Bis 45 Sekunden. Auf Sendung unterbricht den laufenden Titel."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Name",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						className: fieldClass,
						value: title,
						onChange: (event) => setTitle(event.target.value)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [recording ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "danger",
						onClick: stop,
						children: [
							"Stopp · ",
							seconds,
							"s"
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: () => void begin(),
						children: "Aufnahme starten"
					}), blob ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "line",
						disabled: pending,
						onClick: () => void store(false),
						children: "Ablegen"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						disabled: pending || title.trim().length < 2,
						onClick: () => void store(true),
						children: "Auf Sendung"
					})] }) : null]
				}),
				preview ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("audio", {
					controls: true,
					src: preview,
					className: "w-full"
				}) : null,
				error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-danger",
					children: error
				}) : null
			]
		})
	});
}
function Recordings({ data, onSaved }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
		title: "Aufzeichnungen",
		children: [data.recordings.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: "Noch keine."
		}) : null, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "grid min-w-0 grid-cols-1 gap-3",
			children: data.recordings.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				className: "flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: item.title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: [
							clock(item.durationMs),
							" · ",
							item.createdByName,
							" · ",
							formatWhen(item.createdAt)
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "line",
							onClick: () => {
								getClip({ data: { id: item.id } }).then((clip) => {
									return new Audio(`data:${clip.mime};base64,${clip.audioBase64}`).play();
								}).catch((caught) => toast.error(errorText(caught)));
							},
							children: "Hören"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: () => {
								playRecording({ data: { id: item.id } }).then((next) => {
									onSaved(next);
									toast.success("Läuft.");
								}).catch((caught) => toast.error(errorText(caught)));
							},
							children: "Auf Sendung"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							onClick: () => {
								deleteRecording({ data: { id: item.id } }).then(onSaved).catch((caught) => toast.error(errorText(caught)));
							},
							children: "Weg"
						})
					]
				})]
			}, item.id))
		})]
	});
}
function RelayNow({ data, onSaved }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
		title: "Sender jetzt",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-4 text-sm text-muted",
				children: "Übernimmt sofort. Geplante Fenster legt die Regie. Ein laufendes Fenster endet mit Überspringen in der Sendung."
			}),
			data.stations.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Noch keine Sender."
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "grid min-w-0 grid-cols-1 gap-3",
				children: data.stations.map((station) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-medium",
						children: station.name
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: station.note
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex gap-2",
						children: [
							10,
							30,
							60
						].map((minutes) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "line",
							onClick: () => {
								startRelayNow({ data: {
									stationId: station.id,
									minutes
								} }).then((next) => {
									onSaved(next);
									toast.success(`${station.name} für ${minutes} Minuten.`);
								}).catch((caught) => toast.error(errorText(caught)));
							},
							children: [minutes, " min"]
						}, minutes))
					})]
				}, station.id))
			}),
			data.slots.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-4 grid gap-2",
				children: data.slots.slice(0, 6).map((slot) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "text-sm text-muted",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-ink",
							children: slot.title
						}),
						" · ",
						slot.stationName,
						" · ",
						formatWhen(slot.startsAt),
						slot.active ? " · aktiv" : ""
					]
				}, slot.id))
			}) : null
		]
	});
}
function Cue() {
	const [url, setUrl] = (0, import_react.useState)("");
	const [pending, setPending] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Panel, {
		title: "Andere Quelle",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mb-3 text-sm text-muted",
			children: "YouTube-Link wird offiziell eingebettet und läuft nur in den Browsern. Eine direkte Audiodatei (mp3, m4a, ogg, wav) geht auch an Sonos, sobald der Receiver steht. Ganze Titel ohne Abo sucht die Hörerschaft unter «Ganze Titel»."
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "flex gap-2",
			onSubmit: (event) => {
				event.preventDefault();
				setPending(true);
				addExternal({ data: { url } }).then((result) => {
					setUrl("");
					toast.success(`${result.title} liegt in der Queue.`);
				}).catch((caught) => toast.error(errorText(caught))).finally(() => setPending(false));
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				className: fieldClass,
				value: url,
				placeholder: "https://… oder YouTube-Link",
				onChange: (event) => setUrl(event.target.value)
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				disabled: pending || url.trim().length < 8,
				children: "In die Queue"
			})]
		})]
	});
}
function clock(ms) {
	const total = Math.max(0, Math.round(ms / 1e3));
	return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
function blobToBase64(blob) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const text = String(reader.result ?? "");
			const index = text.indexOf(",");
			resolve(index >= 0 ? text.slice(index + 1) : text);
		};
		reader.onerror = () => reject(/* @__PURE__ */ new Error("Aufnahme ließ sich nicht lesen."));
		reader.readAsDataURL(blob);
	});
}
function DjPage() {
	const { user, isPending } = useCurrentUserState();
	if (!useHydrated() || isPending) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StudioIntro, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthSkeleton, {}) });
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RedirectToSignIn, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Desk, {});
}
//#endregion
export { DjPage as component };
