import assert from "node:assert/strict";
import test from "node:test";
import { WISH_GRACE_MS, parseIcs, spotifyPlaylistId, wishFromText, wishesToPrune, youtubePlaylistId, type PruneCandidate } from "./logic.ts";

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
