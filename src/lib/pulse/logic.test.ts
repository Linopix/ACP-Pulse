import assert from "node:assert/strict";
import test from "node:test";
import { WISH_GRACE_MS, parseIcs, wishFromText, wishesToPrune, type PruneCandidate } from "./logic.ts";

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
