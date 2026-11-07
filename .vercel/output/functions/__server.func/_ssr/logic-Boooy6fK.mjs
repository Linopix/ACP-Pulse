import { n as createMiddleware } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/logic-Boooy6fK.js
/**
* Auth middleware for server functions — the standard way to get the caller's
* verified user id. When deployed the session cookie is same-origin and rides
* along automatically. In the live preview the client also forwards the bearer
* token (partitioned cookies) via the `.client` hook below — call sites do not
* thread it themselves.
*
*   import { createServerFn } from "@tanstack/react-start";
*   import { getSql } from "@/lib/db";
*   import { authMiddleware } from "@/lib/auth/middleware";
*
*   export const listTodos = createServerFn({ method: "GET" })
*     .middleware([authMiddleware])
*     .handler(async ({ context }) => {
*       const sql = await getSql();
*       return sql`select * from todos where user_id = ${context.userId}`;
*     });
*
* Signed out with auth on (live preview included) -> throws `UnauthorizedError`
* (see `verify.server.ts`). With auth disabled (`VITE_AUTH_ENABLED=false`, the
* shipped default) it resolves the shared dev user — but throws instead when a
* `DATABASE_URL` is also set, so an app without sign-in must not use this at
* all. On the auth-on path, use it on every server function that touches
* per-user data and scope every query by `context.userId`.
*/
var authMiddleware = createMiddleware({ type: "function" }).client(async ({ next }) => {
	const { getBearerToken } = await import("./client-1vAx-gM_.mjs").then((n) => n.n).then((n) => n.n);
	return next({ sendContext: { bearerToken: getBearerToken() ?? void 0 } });
}).server(async ({ next, context }) => {
	const { assertSameSiteRequest } = await import("./isolation.server-CGNg1r0B.mjs");
	const { requireUserId } = await import("./verify.server-BGA6pdoE.mjs");
	assertSameSiteRequest();
	return next({ context: { userId: await requireUserId(context.bearerToken) } });
});
/** Standardliste für den strengen Event-Filter. Ergänzungen pflegt die Regie. */
var DEFAULT_BLOCKLIST = [
	"fuck",
	"shit",
	"bitch",
	"nigga",
	"nigger",
	"whore",
	"slut",
	"fotze",
	"hurensohn",
	"schwuchtel"
];
function parseWords(raw) {
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const part of raw.split(/[,;\n]/)) {
		const word = part.trim().toLowerCase();
		if (word.length < 2 || word.length > 40 || seen.has(word)) continue;
		seen.add(word);
		out.push(word);
	}
	return out;
}
function voteBudget(queueLength) {
	if (queueLength <= 0) return {
		up: 0,
		down: 0
	};
	if (queueLength === 1) return {
		up: 0,
		down: 1
	};
	return {
		up: Math.max(1, Math.min(queueLength - 1, Math.ceil(queueLength / 3))),
		down: Math.max(1, Math.ceil(queueLength / 4))
	};
}
function isBlocked(track, filter, extraWords) {
	if (filter === "allow") return false;
	if (track.explicit) return true;
	if (filter !== "strict") return false;
	const hay = `${track.title} ${track.artist}`.toLowerCase();
	return [...DEFAULT_BLOCKLIST, ...extraWords].some((word) => word.length > 0 && hay.includes(word));
}
function speechDurationMs(text) {
	const words = text.trim().split(/\s+/).filter(Boolean).length;
	return Math.min(5e4, Math.max(7e3, 2500 + words * 420));
}
function clampVolume(value) {
	if (!Number.isFinite(value)) return 40;
	return Math.max(0, Math.min(100, Math.round(value)));
}
function clampKick(value) {
	if (!Number.isFinite(value)) return 3;
	return Math.max(2, Math.min(20, Math.round(value)));
}
/** Nächster Moderations-Slot, strikt in der Zukunft. */
function nextSlot(slots, from = /* @__PURE__ */ new Date()) {
	const times = slots.split(",").map((part) => part.trim()).filter((part) => /^\d{2}:\d{2}$/.test(part));
	if (times.length === 0) return null;
	const candidates = [];
	for (const dayOffset of [0, 1]) for (const time of times) {
		const [hh, mm] = time.split(":").map(Number);
		const when = new Date(from);
		when.setDate(when.getDate() + dayOffset);
		when.setHours(hh ?? 0, mm ?? 0, 0, 0);
		if (when.getTime() > from.getTime() + 15e3) candidates.push(when);
	}
	candidates.sort((a, b) => a.getTime() - b.getTime());
	return candidates[0] ?? null;
}
function outputLabel(target, room) {
	if (target === "sonos") return room.trim() ? `Sonos · ${room.trim()}` : "Sonos";
	if (target === "receiver") return "Receiver";
	return "Dieser Browser";
}
function isDesk(role) {
	return role === "admin" || role === "dj";
}
/** Offizieller Watch-, Shorts- oder youtu.be-Link. Kein Scraping. */
function youtubeId(raw) {
	const text = raw.trim();
	if (!text) return null;
	try {
		const url = new URL(text);
		const host = url.hostname.toLowerCase().replace(/^www\./, "");
		const piece = (value) => /^[\w-]{6,20}$/.test(value) ? value : null;
		if (host === "youtu.be") return piece(url.pathname.split("/").filter(Boolean)[0] ?? "");
		if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
			if (url.pathname === "/watch") return piece(url.searchParams.get("v") ?? "");
			const parts = url.pathname.split("/").filter(Boolean);
			if ((parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") && parts[1]) return piece(parts[1]);
		}
	} catch {
		return null;
	}
	return null;
}
//#endregion
export { isDesk as a, parseWords as c, youtubeId as d, isBlocked as i, speechDurationMs as l, clampKick as n, nextSlot as o, clampVolume as r, outputLabel as s, authMiddleware as t, voteBudget as u };
