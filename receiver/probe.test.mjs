import assert from "node:assert/strict";
import test from "node:test";
import { soapEnvelope, sonosCalls, start } from "./server.mjs";

test("SOAP-Umschlag ist gültig und maskiert Sonderzeichen", () => {
  const xml = soapEnvelope("Play", "urn:test", { InstanceID: "0", Speed: "1" });
  assert.match(xml, /<u:Play/);
  assert.match(xml, /<InstanceID>0<\/InstanceID>/);
  const calls = sonosCalls({
    url: "https://example.com/a.mp3",
    title: "A & B",
    artist: "X",
    volume: 40,
    room: "Büro",
  });
  assert.deepEqual(
    calls.map((call) => call.action),
    ["SetAVTransportURI", "Play", "SetVolume"],
  );
  assert.match(calls[0].body, new RegExp("A &" + "amp;amp; B"));
  assert.match(calls[0].body, /SetAVTransportURI/);
});

test("Probe trifft den Testlautsprecher und meldet ein fehlendes Gerät", async () => {
  const server = start(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  const health = await fetch(`${base}/v1/health`);
  assert.equal(health.status, 200);

  const probe = await fetch(`${base}/v1/probe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      output: "sonos",
      url: "https://example.com/pulse-probe.mp3",
      title: "Verbindungstest",
      artist: "ACP Pulse",
      volume: 30,
      room: "Test",
      sonosHost: "",
    }),
  });
  const body = await probe.json();
  assert.equal(body.ok, true);
  assert.equal(body.sonosMode, "mock");
  assert.deepEqual(
    body.requests.map((call) => call.action),
    ["SetAVTransportURI", "Play", "SetVolume"],
  );

  const miss = await fetch(`${base}/v1/probe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      output: "sonos",
      url: "https://example.com/pulse-probe.mp3",
      title: "Verbindungstest",
      volume: 30,
      sonosHost: "127.0.0.1:1",
    }),
  });
  const missed = await miss.json();
  assert.equal(missed.ok, false);
  assert.match(missed.detail, /gültig/);

  const play = await fetch(`${base}/v1/play`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      output: "receiver",
      mode: "track",
      url: "https://example.com/song.mp3",
      title: "Song",
      volume: 12,
    }),
  });
  const played = await play.json();
  assert.equal(played.ok, true);
  assert.equal(played.lines.find((line) => line.label === "Sonos").detail, "Nicht beteiligt.");

  const journal = await fetch(`${base}/v1/journal`).then((res) => res.json());
  const traced = journal.journal.find((entry) => entry.kind === "probe" && entry.sonos?.mode === "mock");
  assert.match(traced.sonos.results[0].body, /SetAVTransportURI/);

  server.close();
});
