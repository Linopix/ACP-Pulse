import { o as __toESM } from "../_runtime.mjs";
import { C as require_jsx_runtime, X as require_react, x as Navigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as getServerFnById, i as TSS_SERVER_FUNCTION, r as createServerFn } from "./ssr.mjs";
import { a as hasGateSessionMarker } from "./server-DodX5qZI.mjs";
import { i as signOut } from "./client-1vAx-gM_.mjs";
import { m as useCurrentUser } from "./pulse-landing-CrPH949W.mjs";
import { c as parseWords, n as clampKick, r as clampVolume, t as authMiddleware } from "./logic-Boooy6fK.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/api-DQ2avg10.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var subscribeToNothing = () => () => {};
var noGateSessionOnServer = () => false;
/**
* Auth state components — plain wrappers around `useCurrentUserState()`.
*
* With auth on, visitors are signed out until they authenticate — in the sandbox
* live preview too, which does real sign-in. The shared dev user appears only
* when auth is disabled (`VITE_AUTH_ENABLED=false`, the shipped default).
* While the session is still resolving, gates that care about signed-out state
* render nothing so there's no signed-out flash on hard reload.
*/
/** Where `RedirectToSignIn` sends signed-out visitors. Create this route. */
var SIGN_IN_PATH = "/login";
/**
* Client-side redirect to the sign-in route (TanStack `<Navigate>` — NOT a full
* `window.location` reload). A hard navigation re-bootstraps the SPA and re-runs
* session loading, which feels like a second "Loading…" on /login.
*
* Guard routes by waiting out `isPending` first (see `use-current-user`), then
* render this.
*/
function RedirectToSignIn({ to = SIGN_IN_PATH }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to });
}
/**
* Minimal signed-in identity chip + sign-out. Restyle freely (see the
* `design-ui` skill). Sign-out is only shown when auth is enabled (the
* disabled-auth dev user has nothing to sign out of) and the session is not
* gate-materialized — behind the gate the next request signs the viewer
* straight back in, so a sign-out control there is a broken loop.
*/
function UserButton() {
	const user = useCurrentUser();
	const [signingOut, setSigningOut] = (0, import_react.useState)(false);
	const gateSession = (0, import_react.useSyncExternalStore)(subscribeToNothing, hasGateSessionMarker, noGateSessionOnServer);
	if (!user) return null;
	const label = user.displayName ?? user.primaryEmail ?? "Account";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2",
		children: [
			user.profileImageUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: user.profileImageUrl,
				alt: "",
				className: "h-8 w-8 rounded-full object-cover"
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20",
				children: label.charAt(0).toUpperCase()
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium",
				children: label
			}),
			!gateSession && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				disabled: signingOut,
				onClick: () => {
					setSigningOut(true);
					signOut().catch(() => setSigningOut(false));
				},
				className: "cursor-pointer text-sm underline-offset-4 opacity-70 hover:underline disabled:cursor-wait disabled:no-underline",
				children: signingOut ? "Signing out…" : "Sign out"
			})
		]
	});
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function fail(message) {
	throw new Error(message);
}
function asNum(value, fallback = 0) {
	const n = typeof value === "number" ? value : Number(value);
	return Number.isFinite(n) ? n : fallback;
}
function asIso(value) {
	if (value == null || value === "") return null;
	if (value instanceof Date) return value.toISOString();
	const d = new Date(String(value));
	if (Number.isNaN(d.getTime())) return null;
	return d.toISOString();
}
function asText(value) {
	return typeof value === "string" ? value : value == null ? "" : String(value);
}
function clip(value, max) {
	return asText(value).trim().slice(0, max);
}
function httpsUrl(value) {
	const raw = clip(value, 500);
	if (!raw.startsWith("https://")) return "";
	try {
		const url = new URL(raw);
		return url.protocol === "https:" ? url.toString() : "";
	} catch {
		return "";
	}
}
function asFilter(value) {
	if (value === "allow" || value === "clean" || value === "strict") return value;
	return "clean";
}
function asFilterOrNull(value) {
	if (value == null || value === "") return null;
	if (value === "allow" || value === "clean" || value === "strict") return value;
	return null;
}
function asOutput(value) {
	if (value === "sonos" || value === "receiver" || value === "browser") return value;
	return "browser";
}
function asSource(value) {
	if (value === "spotify" || value === "archive" || value === "youtube" || value === "link") return value;
	return "preview";
}
function blockedHost(hostname) {
	const host = hostname.toLowerCase().replace(/\.+$/, "");
	if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;
	if (host === "169.254.169.254" || host === "metadata.google.internal") return true;
	const parts = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(host);
	if (!parts) return false;
	const a = Number(parts[1]);
	const b = Number(parts[2]);
	if (a === 10 || a === 127 || a === 0) return true;
	if (a === 169 && b === 254) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	return false;
}
function publicHttps(value, max = 300) {
	const raw = clip(value, max);
	let url;
	try {
		url = new URL(raw);
	} catch {
		return "";
	}
	if (url.protocol !== "https:" || url.username || url.password) return "";
	if (blockedHost(url.hostname)) return "";
	return url.toString();
}
function httpOrigin(value) {
	const raw = value.trim();
	if (!raw) return "";
	try {
		const url = new URL(raw.includes("://") ? raw : `http://${raw}`);
		if (url.protocol !== "http:" && url.protocol !== "https:") return "";
		const host = url.hostname.toLowerCase();
		if (host === "169.254.169.254" || host === "metadata.google.internal") return "";
		return url.origin;
	} catch {
		return "";
	}
}
function hostOnly(value) {
	const host = (value.trim().replace(/^https?:\/\//, "").split("/")[0] ?? "").slice(0, 120);
	if (!host || !/^[a-zA-Z0-9.\-:]+$/.test(host)) return "";
	if (host === "169.254.169.254") return "";
	return host;
}
function parseTrack(input) {
	if (!input || typeof input !== "object") fail("Ungültiger Titel.");
	const o = input;
	const title = clip(o.title, 140);
	const artist = clip(o.artist, 140);
	if (title.length < 1 || artist.length < 1) fail("Titel und Interpret fehlen.");
	const source = asSource(o.source);
	const durationMs = Math.max(0, Math.min(9e5, Math.round(asNum(o.durationMs))));
	return {
		title,
		artist,
		album: clip(o.album, 160),
		artworkUrl: httpsUrl(o.artworkUrl),
		previewUrl: source === "youtube" ? "" : httpsUrl(o.previewUrl),
		source,
		externalId: clip(o.externalId, 180),
		explicit: o.explicit === true,
		durationMs
	};
}
function parseSettings(input) {
	if (!input || typeof input !== "object") fail("Einstellungen unvollständig.");
	const o = input;
	const slots = clip(o.moderatorSlots, 80);
	if (slots && !/^\d{2}:\d{2}(\s*,\s*\d{2}:\d{2})*$/.test(slots)) fail("Slots als Uhrzeiten, z. B. 09:00, 12:30, 16:00.");
	return {
		wishesEnabled: o.wishesEnabled === true,
		explicitFilter: asFilter(o.explicitFilter),
		volume: clampVolume(asNum(o.volume, 42)),
		outputTarget: asOutput(o.outputTarget),
		sonosRoom: clip(o.sonosRoom, 80),
		sonosHost: hostOnly(clip(o.sonosHost, 120)),
		receiverUrl: httpOrigin(clip(o.receiverUrl, 200)),
		downvoteKick: clampKick(asNum(o.downvoteKick, 3)),
		extraBlocklist: parseWords(clip(o.extraBlocklist, 400)).join(", "),
		musicSource: o.musicSource === "spotify" ? "spotify" : o.musicSource === "archive" ? "archive" : "preview",
		spotifyClientId: clip(o.spotifyClientId, 80).replace(/[^\w-]/g, ""),
		moderatorEnabled: o.moderatorEnabled === true,
		moderatorSlots: slots || "09:00,12:30,16:00",
		moderatorTopics: parseWords(clip(o.moderatorTopics, 80)).filter((topic) => topic === "lokal" || topic === "firma" || topic === "tech").join(","),
		companyNotes: clip(o.companyNotes, 2e3),
		monitorExternal: o.monitorExternal === true
	};
}
function parseRule(input) {
	if (!input || typeof input !== "object") fail("Regel unvollständig.");
	const o = input;
	const title = clip(o.title, 80);
	const startsAt = asIso(o.startsAt);
	const endsAt = asIso(o.endsAt);
	if (title.length < 2) fail("Die Regel braucht einen Namen.");
	if (!startsAt || !endsAt) fail("Beginn und Ende fehlen.");
	if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) fail("Das Ende liegt vor dem Beginn.");
	const volume = o.volume == null || o.volume === "" ? null : clampVolume(asNum(o.volume));
	return {
		id: o.id == null ? void 0 : asNum(o.id),
		title,
		startsAt,
		endsAt,
		volume,
		wishesEnabled: o.wishesEnabled == null ? null : o.wishesEnabled === true,
		explicitFilter: asFilterOrNull(o.explicitFilter),
		note: clip(o.note, 240)
	};
}
var getStation = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("035c74680e1253d81b2fc5368729632b2a2ec96a03247448cf636dbc111a47b0"));
var searchMusic = createServerFn({ method: "POST" }).validator((input) => {
	const query = clip(input?.query, 80);
	if (query.length < 2) fail("Mindestens 2 Zeichen.");
	return {
		query,
		catalog: input?.catalog === "archive" ? "archive" : "preview"
	};
}).middleware([authMiddleware]).handler(createSsrRpc("b2b9ba4a893f201b2acd722e580eb6ce8a39e9f86d87f8477287534bc83cdc60"));
var addWish = createServerFn({ method: "POST" }).validator((input) => parseTrack(input)).middleware([authMiddleware]).handler(createSsrRpc("4a5bb2f845b83fbf72fa32bab3e8a2b0d460d46ccda4e3ee8e0b0a04b13a109c"));
var castVote = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	const value = input?.value;
	if (!id) fail("Titel fehlt.");
	if (value !== 1 && value !== -1 && value !== 0) fail("Ungültige Stimme.");
	return {
		id,
		value
	};
}).middleware([authMiddleware]).handler(createSsrRpc("23f0aced1753534d67e68736c35da0ec0be2620ae340168dfbe4601a2159d592"));
var withdrawWish = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	if (!id) fail("Titel fehlt.");
	return { id };
}).middleware([authMiddleware]).handler(createSsrRpc("38588adeab36c1082924651a252eda05a4a93df6463437ad635f1d0acba977b5"));
var skipTrack = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(createSsrRpc("96932f0d35f06231992c25b81b50a223cf310359929c455c9a85730d64bcdb99"));
var postAnnouncement = createServerFn({ method: "POST" }).validator((input) => {
	const title = clip(input?.title, 80);
	const body = clip(input?.body, 500);
	if (title.length < 2) fail("Die Durchsage braucht einen Titel.");
	if (body.length < 8) fail("Der Text ist zu kurz.");
	return {
		title,
		body
	};
}).middleware([authMiddleware]).handler(createSsrRpc("215ad7fe84849ab30cad564077cf246556e749256aac3a0edf4b8dab498abd87"));
var getAdmin = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("d609378bae3e753f4e519981a1015dbfa05c9c3ad3d4c21270f91d30d40cddcd"));
var saveSettings = createServerFn({ method: "POST" }).validator((input) => parseSettings(input)).middleware([authMiddleware]).handler(createSsrRpc("ace1dcc032400705a48095e2ed5eb61dce926f8c6b658d6cf27ba24063e39998"));
var saveRule = createServerFn({ method: "POST" }).validator((input) => parseRule(input)).middleware([authMiddleware]).handler(createSsrRpc("d7e04468e581688795bb63568bcce49f3caca7ff362e56c6579c132c707de628"));
var deleteRule = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	if (!id) fail("Regel fehlt.");
	return { id };
}).middleware([authMiddleware]).handler(createSsrRpc("2f25a9beb898ef98539ce31234c2302803a25bfa7c1c8f8c273d6630aaab7525"));
var createPlaylist = createServerFn({ method: "POST" }).validator((input) => {
	const name = clip(input?.name, 60);
	if (name.length < 2) fail("Name zu kurz.");
	return { name };
}).middleware([authMiddleware]).handler(createSsrRpc("6036e4e333c0c942cb521e3ac7ca6eac3eacb7d2a1e50db21d6c0332121eac53"));
var setFallback = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	if (!id) fail("Playlist fehlt.");
	return { id };
}).middleware([authMiddleware]).handler(createSsrRpc("6775c241049911fda28002ce8cc17c218aa376d4d147ac1835e87f5c90ab7e35"));
var deletePlaylist = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	if (!id) fail("Playlist fehlt.");
	return { id };
}).middleware([authMiddleware]).handler(createSsrRpc("e0f73301438a5bae62e4ecb42ba5779cf7636e61e3814b5fdf2de0b65617c11a"));
var addPlaylistTrack = createServerFn({ method: "POST" }).validator((input) => {
	const playlistId = asNum(input?.playlistId);
	if (!playlistId) fail("Playlist fehlt.");
	return {
		playlistId,
		track: parseTrack(input?.track)
	};
}).middleware([authMiddleware]).handler(createSsrRpc("f82794ad5a4d1d5b1eabc96cc33092a74affb0c384efb0c4f1844819c9633042"));
var removePlaylistTrack = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	if (!id) fail("Titel fehlt.");
	return { id };
}).middleware([authMiddleware]).handler(createSsrRpc("05ee9a13580b3b15fceddb1b3858eead13bd5343a561c25264ec990dc2639a16"));
var generateModeration = createServerFn({ method: "POST" }).validator((input) => ({ immediate: input?.immediate === true })).middleware([authMiddleware]).handler(createSsrRpc("bb10633a2d6fc3b97a5d45794aa19d40beb0ba2f4c3184c9837163a56815b6c7"));
var setMemberRole = createServerFn({ method: "POST" }).validator((input) => {
	const userId = clip(input?.userId, 80);
	if (!userId) fail("Person fehlt.");
	if (input?.role !== "admin" && input?.role !== "dj" && input?.role !== "listener") fail("Rolle ungültig.");
	return {
		userId,
		role: input.role
	};
}).middleware([authMiddleware]).handler(createSsrRpc("e42b7b10548c26719e21483616bb1fb8c458e7b945a3e977c20f912cd95828a4"));
var checkOutput = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(createSsrRpc("e0bea75afadc455ed243035d2124d0ec7a5f4c31b2c1fb0a33b6b0bd67a82ef6"));
function clipMime(value) {
	const mime = clip(value, 80).split(";")[0]?.trim().toLowerCase() ?? "";
	if (mime === "audio/webm" || mime === "audio/mp4" || mime === "audio/ogg" || mime === "audio/wav" || mime === "audio/mpeg") return mime;
	fail("Dieses Audioformat geht nicht.");
}
function clipAudio(value) {
	const raw = asText(value).replace(/\s/g, "");
	if (raw.length < 32 || raw.length > 15e5) fail("Die Aufnahme ist zu lang oder leer.");
	if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) fail("Aufnahme unvollständig.");
	return raw;
}
var getDesk = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(createSsrRpc("7591afc6bbd3e27658fa699667345d3230f33d7ee482171460846adab6d56097"));
var saveRecording = createServerFn({ method: "POST" }).validator((input) => {
	const title = clip(input?.title, 80);
	if (title.length < 2) fail("Die Aufnahme braucht einen Namen.");
	const durationMs = Math.round(asNum(input?.durationMs));
	if (durationMs < 800 || durationMs > 45e3) fail("Aufnahmen sind 1 bis 45 Sekunden lang.");
	return {
		title,
		mime: clipMime(input?.mime),
		audioBase64: clipAudio(input?.audioBase64),
		durationMs,
		air: input?.air === true
	};
}).middleware([authMiddleware]).handler(createSsrRpc("02f4f17e4832ff6a0a30e944bce9bce87dafeca49f5d0e30bb0eac0d61ae0d99"));
var playRecording = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	if (!id) fail("Aufnahme fehlt.");
	return { id };
}).middleware([authMiddleware]).handler(createSsrRpc("23db349c7ce31b371608303f7d11f179009cc23f6c552ba814f1181cb41eb14c"));
var deleteRecording = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	if (!id) fail("Aufnahme fehlt.");
	return { id };
}).middleware([authMiddleware]).handler(createSsrRpc("3bff6bdad634a1d030e3b84eb37c0d5775ceb973884fbda3088b1ffb12504064"));
var getClip = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	if (!id) fail("Aufnahme fehlt.");
	return { id };
}).middleware([authMiddleware]).handler(createSsrRpc("73bd71beb474da79631d32c25cc2daee00c5489575ffbf22929f5110b343e88e"));
var addExternal = createServerFn({ method: "POST" }).validator((input) => {
	const url = clip(input?.url, 400);
	if (url.length < 8) fail("Link fehlt.");
	return { url };
}).middleware([authMiddleware]).handler(createSsrRpc("069028915573be7272a6ede9486e4af4f3863ec7b78e58625444bfda8f98e726"));
var saveStation = createServerFn({ method: "POST" }).validator((input) => {
	const name = clip(input?.name, 80);
	const stream = publicHttps(clip(input?.streamUrl, 300));
	if (name.length < 2) fail("Der Sender braucht einen Namen.");
	if (!stream) fail("Nur öffentliche https-Streams.");
	return {
		name,
		streamUrl: stream,
		note: clip(input?.note, 160)
	};
}).middleware([authMiddleware]).handler(createSsrRpc("5c83f74f0bf7a0c2b4fb5011df0bb5b711dac0f5dfea48e066c5a3c55c7c4d61"));
var deleteStation = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	if (!id) fail("Sender fehlt.");
	return { id };
}).middleware([authMiddleware]).handler(createSsrRpc("f53e39ccf799abe3373684a440a71031ace35f298525d4a150bddebc38af353d"));
var saveRelaySlot = createServerFn({ method: "POST" }).validator((input) => {
	const stationId = asNum(input?.stationId);
	const title = clip(input?.title, 80);
	const startsAt = asIso(input?.startsAt);
	const endsAt = asIso(input?.endsAt);
	if (!stationId) fail("Sender fehlt.");
	if (title.length < 2) fail("Das Fenster braucht einen Namen.");
	if (!startsAt || !endsAt) fail("Beginn und Ende fehlen.");
	if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) fail("Das Ende liegt vor dem Beginn.");
	return {
		stationId,
		title,
		startsAt,
		endsAt
	};
}).middleware([authMiddleware]).handler(createSsrRpc("5b26076524b13768166bc9d84bf23d8b0e92048f14d7440ba6c28cfecb2da76b"));
var deleteRelaySlot = createServerFn({ method: "POST" }).validator((input) => {
	const id = asNum(input?.id);
	if (!id) fail("Fenster fehlt.");
	return { id };
}).middleware([authMiddleware]).handler(createSsrRpc("5291cc775da5f870db2d5e984847620db11237914ba5384a2f2854ab32dea9b5"));
var startRelayNow = createServerFn({ method: "POST" }).validator((input) => {
	const stationId = asNum(input?.stationId);
	const minutes = Math.round(asNum(input?.minutes));
	if (!stationId) fail("Sender fehlt.");
	if (minutes !== 10 && minutes !== 30 && minutes !== 60) fail("10, 30 oder 60 Minuten.");
	return {
		stationId,
		minutes
	};
}).middleware([authMiddleware]).handler(createSsrRpc("34deabf4266979b9e3936f2f75f4b89ab920f5f77f84e7c66789c69c0f0d466f"));
//#endregion
export { skipTrack as A, saveRelaySlot as C, searchMusic as D, saveStation as E, withdrawWish as M, setFallback as O, saveRecording as S, saveSettings as T, getDesk as _, addWish as a, postAnnouncement as b, createPlaylist as c, deleteRelaySlot as d, deleteRule as f, getClip as g, getAdmin as h, addPlaylistTrack as i, startRelayNow as j, setMemberRole as k, deletePlaylist as l, generateModeration as m, UserButton as n, castVote as o, deleteStation as p, addExternal as r, checkOutput as s, RedirectToSignIn as t, deleteRecording as u, getStation as v, saveRule as w, removePlaylistTrack as x, playRecording as y };
