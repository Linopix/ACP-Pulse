import assert from "node:assert/strict";
import test from "node:test";
import { WISH_GRACE_MS, deviceOnline, nextSlot, parseIcs, spotifyPlaylistId, stationSeconds, syncNudge, wishFromText, wishesToPrune, youtubePlaylistId, type PruneCandidate } from "./logic.ts";

const now = 1_000_000;

function item(partial: Partial<PruneCandidate> & Pick<PruneCandidate, "id">): PruneCandidate {
  return {
    upvotes: 0,
    downvotes: 0,
    createdAt: now - WISH_GRACE_MS - 1,
    playing: false,
    ...partial,
  };
}

test("auto lässt die Queue in Ruhe, solange sie kurz ist", () => {
  const ids = wishesToPrune([item({ id: 1 }), item({ id: 2 })], { mode: "auto", threshold: 4 }, now);
  assert.deepEqual(ids, []);
});

test("auto entfernt schwache Wünsche ab der Grenze", () => {
  const ids = wishesToPrune(
    [
      item({ id: 1, upvotes: 0, downvotes: 0 }),
      item({ id: 2, upvotes: 1, downvotes: 2 }),
      item({ id: 3, upvotes: 2, downvotes: 1 }),
      item({ id: 4, upvotes: 2, downvotes: 2 }),
      item({ id: 5, upvotes: 0, createdAt: now - 1_000 }),
      item({ id: 6, playing: true, upvotes: 0 }),
    ],
    { mode: "auto", threshold: 4 },
    now,
  );
  assert.deepEqual(ids, [1, 2]);
});

test("aus schaltet das automatische Aufräumen ab", () => {
  const ids = wishesToPrune([item({ id: 1 }), item({ id: 2 }), item({ id: 3 }), item({ id: 4 })], { mode: "off", threshold: 4 }, now);
  assert.deepEqual(ids, []);
});

test("manuell räumt sofort auf, auch frische Wünsche", () => {
  const ids = wishesToPrune(
    [item({ id: 1, createdAt: now }), item({ id: 2, upvotes: 3, downvotes: 0 })],
    { mode: "off", threshold: 8, manual: true },
    now,
  );
  assert.deepEqual(ids, [1]);
});

test("Outlook-Text setzt leise und keine Wünsche", () => {
  const wish = wishFromText("Jour fixe. Bitte leise. Keine Wünsche.");
  assert.equal(wish.volume, 24);
  assert.equal(wish.wishesEnabled, false);
});

test("erlaubt ist kein Lautstärke-Hinweis", () => {
  const wish = wishFromText("Wünsche erlaubt, kein Callcenter.");
  assert.equal(wish.volume, null);
  assert.equal(wish.wishesEnabled, null);
});

test("lauter überschreibt leise", () => {
  const wish = wishFromText("Erst leise, dann lauter zum Feierabend.");
  assert.equal(wish.volume, 58);
});

test("Feierabend und eventuell sind keine Laut-Hinweise", () => {
  assert.equal(wishFromText("Feierabend. Bitte leise.").volume, 24);
  assert.equal(wishFromText("Eventuell leise lassen.").volume, 24);
  assert.equal(wishFromText("Kleine Feier im Hof.").volume, 58);
  assert.equal(wishFromText("Event im Foyer.").volume, 58);
});

test("Moderations-Slots sind Berliner Uhrzeit", () => {
  const winter = nextSlot("09:00,12:30", new Date("2026-11-07T07:30:00.000Z"));
  assert.equal(winter?.toISOString(), "2026-11-07T08:00:00.000Z");
  const after = nextSlot("09:00", new Date("2026-11-07T08:00:00.000Z"));
  assert.equal(after?.toISOString(), "2026-11-08T08:00:00.000Z");
  const summer = nextSlot("09:00", new Date("2026-07-07T06:00:00.000Z"));
  assert.equal(summer?.toISOString(), "2026-07-07T07:00:00.000Z");
});

test("ICS ohne Z ist Berliner Bürozeit", () => {
  const events = parseIcs(`BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20261107T090000
DTEND:20261107T093000
SUMMARY:Standup
UID:standup
END:VEVENT
END:VCALENDAR`);
  assert.equal(events[0]?.startsAt, "2026-11-07T08:00:00.000Z");
  assert.equal(events[0]?.endsAt, "2026-11-07T08:30:00.000Z");
});

test("ICS liefert Beginn, Ende und Titel", () => {
  const events = parseIcs(`BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20261107T090000Z
DTEND:20261107T093000Z
SUMMARY:Townhall
DESCRIPTION:etwas lauter
UID:townhall
END:VEVENT
END:VCALENDAR`);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.title, "Townhall");
  assert.equal(events[0]?.startsAt, "2026-11-07T09:00:00.000Z");
});

test("Gleichlauf ist allein leise und in der Gruppe früh", () => {
  assert.deepEqual(syncNudge(10, 10.02), { rate: 1, seekTo: null });
  const slow = syncNudge(10.5, 10);
  assert.equal(slow.seekTo, null);
  assert.ok(slow.rate < 1 && slow.rate >= 0.988);
  const fast = syncNudge(10, 10.5);
  assert.equal(fast.seekTo, null);
  assert.ok(fast.rate > 1 && fast.rate <= 1.012);
  assert.equal(syncNudge(10.9, 10).seekTo, null);
  assert.deepEqual(syncNudge(3, 10), { rate: 1, seekTo: 10 });
  assert.deepEqual(syncNudge(10, 3, { live: true }), { rate: 1, seekTo: null });
  assert.deepEqual(syncNudge(10.4, 10, { fractionalRate: false }), { rate: 1, seekTo: null });
  assert.deepEqual(syncNudge(12, 10, { fractionalRate: false }), { rate: 1, seekTo: 10 });
  assert.deepEqual(syncNudge(10.5, 10, { grouped: true }), { rate: 1, seekTo: 10 });
  const room = syncNudge(10.12, 10, { grouped: true });
  assert.equal(room.seekTo, null);
  assert.ok(room.rate < 1 && room.rate >= 0.96);
  assert.deepEqual(syncNudge(10.1, 10, { fractionalRate: false, grouped: true }), { rate: 1, seekTo: null });
  assert.deepEqual(syncNudge(10.25, 10, { fractionalRate: false, grouped: true }), { rate: 1, seekTo: 10 });
  assert.equal(stationSeconds("2026-01-01T00:00:00.000Z", Date.parse("2026-01-01T00:00:02.500Z")), 2.5);
  assert.equal(stationSeconds(""), null);
});

test("Playlist-Links werden zur ID", () => {
  assert.equal(spotifyPlaylistId("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=abc"), "37i9dQZF1DXcBWIGoYBM5M");
  assert.equal(spotifyPlaylistId("spotify:playlist:37i9dQZF1DXcBWIGoYBM5M"), "37i9dQZF1DXcBWIGoYBM5M");
  assert.equal(spotifyPlaylistId("https://open.spotify.com/track/3zOYmiNOuyDL0ClxJcEJ0T"), null);
  assert.equal(
    youtubePlaylistId("https://www.youtube.com/playlist?list=PLt7bG0K25iXj2h1eql20RZIPB_2CtK659"),
    "PLt7bG0K25iXj2h1eql20RZIPB_2CtK659",
  );
  assert.equal(youtubePlaylistId("https://music.youtube.com/playlist?list=PLDIoUOhQQPlUDNpjEYTTE9tb-QvUHUSMt"), "PLDIoUOhQQPlUDNpjEYTTE9tb-QvUHUSMt");
  assert.equal(youtubePlaylistId("https://youtu.be/dQw4w9WgXcQ"), null);
});

test("Geräte sind nur kurz nach der letzten Meldung verbunden", () => {
  const now = Date.parse("2026-11-12T09:00:00.000Z");
  assert.equal(deviceOnline("2026-11-12T08:59:55.000Z", now), true);
  assert.equal(deviceOnline("2026-11-12T08:59:40.000Z", now), false);
  assert.equal(deviceOnline(""), false);
});
