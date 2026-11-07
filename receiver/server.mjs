/**
 * Test-Receiver für ACP Pulse.
 *
 * Nimmt Play und Lautstärke an, spricht Sonos per SOAP an und hält ohne Gerät
 * einen Testlautsprecher im Prozess. Die Umschläge liegen im Journal.
 *
 *   GET  /                Statusseite
 *   GET  /v1/health       Lebenszeichen
 *   GET  /v1/journal      letzte Befehle
 *   GET  /sonos/state     Zustand des Testlautsprechers
 *   POST /v1/probe        prüfen, nichts starten
 *   POST /v1/play         annehmen, bei Sonos abschicken
 *   POST /v1/volume       nur Lautstärke
 *   POST /MediaRenderer/… SOAP-Gegenstelle des Testlautsprechers
 *
 * Sonos-Ziel ist Host oder Host:Port. Leer oder "mock" bleibt im Prozess, Port sonst 1400.
 */
import http from "node:http";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 8090);
const HOST = process.env.HOST || "0.0.0.0";

const journal = [];
const mock = {
  uri: "",
  title: "",
  artist: "",
  room: "",
  volume: 40,
  playing: false,
  calls: [],
};
let nowPlaying = {
  title: "Nichts",
  artist: "",
  mode: "idle",
  output: "",
  room: "",
  volume: 40,
  at: "",
  url: "",
  youtubeId: "",
};

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;")
    .replace(/'/g, "&" + "apos;");
}

/** SOAP-Umschlag. Feldwerte werden escapet, CurrentURIMetaData damit ein zweites Mal. */
export function soapEnvelope(action, service, fields) {
  const inner = Object.entries(fields)
    .map(([key, value]) => `<${key}>${escapeXml(value)}</${key}>`)
    .join("");
  return `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:${action} xmlns:u="${service}">${inner}</u:${action}>
  </s:Body>
</s:Envelope>`;
}

const AV = "urn:schemas-upnp-org:service:AVTransport:1";
const RC = "urn:schemas-upnp-org:service:RenderingControl:1";

/** SetAVTransportURI, Play, SetVolume. Dieselben drei Aufrufe gehen an ein echtes Gerät. */
export function sonosCalls({ url, title, artist, volume, room }) {
  const meta = `<DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/" xmlns:dc="http://purl.org/dc/elements/1.1/"><item><dc:title>${escapeXml(title)}</dc:title><dc:creator>${escapeXml(artist)}</dc:creator></item></DIDL-Lite>`;
  return [
    {
      action: "SetAVTransportURI",
      service: AV,
      path: "/MediaRenderer/AVTransport/Control",
      fields: { InstanceID: "0", CurrentURI: url || "", CurrentURIMetaData: meta },
    },
    {
      action: "Play",
      service: AV,
      path: "/MediaRenderer/AVTransport/Control",
      fields: { InstanceID: "0", Speed: "1" },
    },
    {
      action: "SetVolume",
      service: RC,
      path: "/MediaRenderer/RenderingControl/Control",
      fields: { InstanceID: "0", Channel: "Master", DesiredVolume: String(clampVolume(volume)) },
    },
  ].map((call) => ({
    ...call,
    room: room || "",
    body: soapEnvelope(call.action, call.service, call.fields),
  }));
}

export function volumeCall(volume) {
  const call = {
    action: "SetVolume",
    service: RC,
    path: "/MediaRenderer/RenderingControl/Control",
    fields: { InstanceID: "0", Channel: "Master", DesiredVolume: String(clampVolume(volume)) },
  };
  return { ...call, body: soapEnvelope(call.action, call.service, call.fields) };
}

function clampVolume(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 40;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function sonosTarget(host) {
  const raw = String(host ?? "").trim();
  if (!raw || raw === "mock") return null;
  const ipv6 = raw.startsWith("[");
  const cut = ipv6 ? raw : raw;
  const idx = ipv6 ? cut.lastIndexOf("]:") : cut.lastIndexOf(":");
  if (idx > 0) {
    const hostname = ipv6 ? cut.slice(1, idx) : cut.slice(0, idx);
    const port = Number(ipv6 ? cut.slice(idx + 2) : cut.slice(idx + 1)) || 1400;
    return { hostname, port };
  }
  return { hostname: raw, port: 1400 };
}

function pushJournal(entry) {
  journal.unshift({ at: new Date().toISOString(), ...entry });
  journal.splice(40);
}

function applyMock(calls, { title, artist, room, volume, url }) {
  const results = calls.map((call) => {
    mock.calls.unshift({ at: new Date().toISOString(), action: call.action, status: 200 });
    mock.calls.splice(20);
    return { action: call.action, target: "Testlautsprecher", status: 200, ok: true };
  });
  mock.uri = url || mock.uri;
  mock.title = title || mock.title;
  mock.artist = artist || mock.artist;
  mock.room = room || mock.room;
  mock.volume = clampVolume(volume);
  mock.playing = Boolean(url);
  return results;
}

function postSoap(target, call) {
  const body = call.body;
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: call.path,
        method: "POST",
        headers: {
          "content-type": "text/xml; charset=utf-8",
          soapaction: `"${call.service}#${call.action}"`,
          "content-length": Buffer.byteLength(body),
        },
        timeout: 2500,
      },
      (res) => {
        res.resume();
        const ok = res.statusCode != null && res.statusCode >= 200 && res.statusCode < 300;
        resolve({ action: call.action, target: `${target.hostname}:${target.port}`, status: res.statusCode ?? 0, ok });
      },
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ action: call.action, target: `${target.hostname}:${target.port}`, status: 0, ok: false, note: "Zeitüberschreitung" });
    });
    req.on("error", (error) => {
      resolve({
        action: call.action,
        target: `${target.hostname}:${target.port}`,
        status: 0,
        ok: false,
        note: error.code === "ECONNREFUSED" ? "Keine Verbindung" : "Nicht erreichbar",
      });
    });
    req.end(body);
  });
}

async function speakSonos(body, calls) {
  const target = sonosTarget(body.sonosHost);
  if (!target) {
    return { mode: "mock", results: applyMock(calls, body) };
  }
  const results = [];
  for (const call of calls) results.push(await postSoap(target, call));
  return { mode: "device", results };
}

function line(label, ok, detail) {
  return { label, ok, detail };
}

async function handleCommand(body, { dryRun, volumeOnly }) {
  const output = body.output === "sonos" || body.output === "receiver" ? body.output : "browser";
  const volume = clampVolume(body.volume);
  const title = String(body.title ?? "").slice(0, 180);
  const artist = String(body.artist ?? "").slice(0, 180);
  const url = String(body.url ?? "").slice(0, 500);
  const youtubeId = /^[\w-]{6,20}$/.test(String(body.youtubeId ?? "")) ? String(body.youtubeId) : "";
  const room = String(body.room ?? "").slice(0, 80);
  const text = String(body.text ?? "").slice(0, 500);
  const payload = { ...body, output, volume, title, artist, url, room, text };
  const lines = [];

  if (!volumeOnly) {
    const hasAudio = /^https?:\/\//.test(url);
    if (output === "receiver" && youtubeId && !hasAudio) {
      lines.push(line("Play", true, dryRun ? "Angenommen, nicht gestartet." : "YouTube auf der Receiver-Seite."));
    } else if (!hasAudio && text) {
      lines.push(line("Play", true, "Nur Text. Sonos braucht eine Audiodatei, die Receiver-Seite hat keine Stimme."));
    } else if (!hasAudio) {
      lines.push(line("Play", false, "Keine Audiodatei. YouTube geht an die Receiver-Seite, nicht an Sonos."));
    } else {
      lines.push(line("Play", true, dryRun ? "Angenommen, nicht gestartet." : "Angenommen."));
    }
  }

  let sonos = { mode: "skipped", results: [] };
  if (output === "sonos") {
    const hasAudio = /^https?:\/\//.test(url);
    if (!volumeOnly && !hasAudio) {
      lines.push(line("Sonos", false, "Keine Audiodatei. Sonos bekommt diesen Titel nicht."));
    } else {
      const calls = volumeOnly ? [volumeCall(volume)] : sonosCalls(payload);
      sonos = await speakSonos(payload, calls);
      sonos.results = sonos.results.map((result, index) => ({ ...result, body: calls[index]?.body ?? "" }));
      const failed = sonos.results.filter((item) => !item.ok);
      const where = sonos.mode === "mock" ? "Testlautsprecher" : payload.sonosHost || "Sonos";
      if (failed.length === 0) {
        lines.push(line("Sonos", true, `${where}: ${sonos.results.map((item) => item.action).join(", ")} ok.`));
      } else {
        lines.push(
          line(
            "Sonos",
            false,
            `${where} antwortet nicht. Befehle sind gültig: ${sonos.results.map((item) => item.action).join(", ")}.`,
          ),
        );
      }
    }
  } else if (!volumeOnly) {
    lines.push(line("Sonos", true, "Nicht beteiligt."));
  }

  if (!volumeOnly || output !== "sonos") {
    lines.push(line("Lautstärke", true, `${volume}`));
  }

  const accepted = lines.find((item) => item.label === "Play")?.ok !== false;
  if (!dryRun && !volumeOnly && accepted) {
    nowPlaying = {
      title: title || (text ? "Durchsage" : "Ohne Titel"),
      artist,
      mode: String(body.mode ?? "track"),
      output,
      room,
      volume,
      at: new Date().toISOString(),
      url: /^https?:\/\//.test(url) ? url : "",
      youtubeId,
    };
    if (output === "receiver") mock.volume = volume;
  }
  if (!dryRun && volumeOnly) {
    nowPlaying = { ...nowPlaying, volume };
    mock.volume = volume;
  }

  const ok = lines.every((item) => item.ok);
  const detail = lines.find((item) => item.label === "Sonos" && !item.ok)?.detail
    ?? lines.find((item) => !item.ok)?.detail
    ?? (output === "sonos"
      ? sonos.mode === "mock"
        ? "Testlautsprecher hat die Befehle angenommen."
        : "Sonos hat die Befehle angenommen."
      : "Receiver hat die Sendung angenommen.");

  const entry = {
    kind: dryRun ? "probe" : volumeOnly ? "volume" : "play",
    ok,
    detail,
    output,
    room,
    title,
    lines,
    sonos,
  };
  pushJournal(entry);
  const requests = sonos.results.map(({ body: _body, ...rest }) => rest);
  return { ok, detail, lines, sonosMode: sonos.mode, requests };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 100_000) {
        reject(new Error("zu groß"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("kein JSON"));
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "content-type": type,
    "access-control-allow-origin": "*",
    "cache-control": "no-store",
  });
  res.end(payload);
}

function handleMockSoap(req, res, raw) {
  const action = String(req.headers.soapaction ?? "").replace(/"/g, "");
  const name = action.split("#")[1] || "Unbekannt";
  mock.calls.unshift({ at: new Date().toISOString(), action: name, status: 200, external: true });
  mock.calls.splice(20);
  if (name === "SetAVTransportURI") {
    const uri = raw.match(/<CurrentURI>([^<]*)<\/CurrentURI>/);
    mock.uri = uri?.[1] ?? mock.uri;
    mock.playing = true;
  }
  if (name === "SetVolume") {
    const vol = raw.match(/<DesiredVolume>([^<]*)<\/DesiredVolume>/);
    mock.volume = clampVolume(vol?.[1]);
  }
  const service = action.split("#")[0] || AV;
  const xml = `<?xml version="1.0"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:${escapeXml(name)}Response xmlns:u="${escapeXml(service)}"/></s:Body></s:Envelope>`;
  send(res, 200, xml, "text/xml; charset=utf-8");
}

function publicNow() {
  return {
    title: nowPlaying.title,
    artist: nowPlaying.artist,
    mode: nowPlaying.mode,
    output: nowPlaying.output,
    room: nowPlaying.room,
    volume: nowPlaying.volume,
    at: nowPlaying.at,
    url: nowPlaying.url,
    youtubeId: nowPlaying.youtubeId,
  };
}

function page() {
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pulse Receiver</title>
<style>
  body{margin:0;background:#0e1211;color:#f3f6f4;font:16px/1.45 Outfit,Segoe UI,sans-serif}
  main{max-width:40rem;margin:0 auto;padding:1.5rem}
  h1{font-family:Georgia,serif;font-weight:500;font-size:2rem;margin:0 0 .5rem}
  p,li{color:#9aaba4}
  strong{color:#f3f6f4;font-weight:500}
  button{height:2.75rem;padding:0 1rem;border:0;border-radius:8px;background:#2f9d86;color:#06211c;font:inherit;cursor:pointer}
  #stage{margin:1rem 0;background:#161c1a;border:1px solid #2c3834;border-radius:12px;min-height:12rem;display:grid;place-items:center;overflow:hidden}
  #stage iframe{width:100%;aspect-ratio:16/9;border:0}
  audio{width:100%}
  ul{padding:0;list-style:none;display:grid;gap:.75rem}
  li{border-top:1px solid #2c3834;padding-top:.75rem}
</style></head>
<body><main>
  <h1>Receiver</h1>
  <p>Diese Seite ist der Lautsprecher. Sonos geht an das Gerät, YouTube und Audiodateien spielen hier.</p>
  <p id="label">Wartet auf die Sendung.</p>
  <div id="stage"><p id="idle">Noch still.</p></div>
  <audio id="file" playsinline></audio>
  <p><button id="arm" type="button">Ton an</button></p>
  <ul id="journal"></ul>
</main>
<script>
  const stage = document.getElementById("stage");
  const label = document.getElementById("label");
  const idle = document.getElementById("idle");
  const file = document.getElementById("file");
  const arm = document.getElementById("arm");
  let armed = false;
  let key = "";
  let player = null;
  arm.addEventListener("click", () => {
    armed = true;
    arm.hidden = true;
    key = "";
    void tick();
  });
  function elapsed(at) {
    const t = Date.parse(at || "");
    return Number.isFinite(t) ? Math.max(0, (Date.now() - t) / 1000) : 0;
  }
  function clearStage() {
    if (player && player.destroy) player.destroy();
    player = null;
    stage.innerHTML = "";
    stage.appendChild(idle);
    idle.hidden = false;
  }
  function mountYoutube(id, start, volume) {
    idle.hidden = true;
    file.pause();
    if (player && player.destroy) player.destroy();
    const slot = document.createElement("div");
    stage.innerHTML = "";
    stage.appendChild(slot);
    player = new YT.Player(slot, {
      videoId: id,
      playerVars: { autoplay: armed ? 1 : 0, start: Math.floor(start), rel: 0 },
      events: { onReady(event) { event.target.setVolume(volume); if (armed) event.target.playVideo(); } }
    });
  }
  async function tick() {
    try {
      const now = await fetch("/v1/now").then((res) => res.json());
      label.textContent = (now.title || "Nichts") + (now.artist ? " · " + now.artist : "") + " · Lautstärke " + now.volume;
      const vol = Math.max(0, Math.min(100, Number(now.volume) || 0));
      file.volume = vol / 100;
      if (now.output === "sonos") {
        if (key !== "sonos") { key = "sonos"; clearStage(); idle.textContent = "Läuft auf Sonos."; }
        return;
      }
      const next = (now.youtubeId || "") + "|" + (now.url || "") + "|" + (now.at || "");
      const tube = /^[\\w-]{6,20}$/.test(now.youtubeId || "");
      if (tube && !(window.YT && YT.Player)) return;
      if (next === key) {
        if (player && player.setVolume) player.setVolume(vol);
        return;
      }
      key = next;
      if (tube) {
        mountYoutube(now.youtubeId, elapsed(now.at), vol);
        return;
      }
      if (player) clearStage();
      if (/^https?:\\/\\//.test(now.url || "")) {
        idle.hidden = true;
        file.src = now.url;
        if (armed) {
          try { await file.play(); file.currentTime = elapsed(now.at); } catch (e) { arm.hidden = false; }
        }
        return;
      }
      idle.hidden = false;
      idle.textContent = now.title && now.title !== "Nichts" ? "Dieser Beitrag hat hier keinen Ton." : "Noch still.";
      file.pause();
    } catch (e) { label.textContent = "Receiver gerade nicht erreichbar."; }
  }
  window.onYouTubeIframeAPIReady = () => { key = ""; void tick(); };
  const api = document.createElement("script");
  api.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(api);
  setInterval(() => void tick(), 2000);
  void tick();
</script>
</body></html>`;
}

async function route(req, res) {
  const url = new URL(req.url || "/", "http://receiver.local");
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,soapaction",
    });
    res.end();
    return;
  }
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    send(res, 200, page(), "text/html; charset=utf-8");
    return;
  }
  if (req.method === "GET" && url.pathname === "/v1/health") {
    send(res, 200, { ok: true, service: "pulse-receiver", sonos: "mock" });
    return;
  }
  if (req.method === "GET" && url.pathname === "/v1/now") {
    send(res, 200, publicNow());
    return;
  }
  if (req.method === "GET" && url.pathname === "/v1/journal") {
    send(res, 200, { now: nowPlaying, mock: { ...mock, calls: mock.calls }, journal });
    return;
  }
  if (req.method === "GET" && url.pathname === "/sonos/state") {
    send(res, 200, mock);
    return;
  }
  if (req.method === "POST" && url.pathname.startsWith("/MediaRenderer/")) {
    const raw = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      req.on("error", reject);
    });
    handleMockSoap(req, res, raw);
    return;
  }
  if (req.method === "POST" && (url.pathname === "/v1/play" || url.pathname === "/v1/probe" || url.pathname === "/v1/volume")) {
    let body;
    try {
      body = await readBody(req);
    } catch {
      send(res, 400, { ok: false, detail: "Ungültiger Inhalt.", lines: [] });
      return;
    }
    const result = await handleCommand(body, {
      dryRun: url.pathname === "/v1/probe",
      volumeOnly: url.pathname === "/v1/volume",
    });
    send(res, 200, result);
    return;
  }
  send(res, 404, { ok: false, detail: "Unbekannt." });
}

export function start(port = PORT, host = HOST) {
  const server = http.createServer((req, res) => {
    route(req, res).catch((error) => {
      send(res, 500, { ok: false, detail: error instanceof Error ? error.message : "Fehler" });
    });
  });
  server.listen(port, host);
  return server;
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  start();
  console.log(`receiver ${HOST}:${PORT}`);
}
