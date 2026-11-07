/**
 * Kleiner Piper-Dienst für ACP Pulse.
 * POST JSON { "text", "voice" } antwortet mit audio/wav.
 * Stimmen: de_DE-kerstin-low, de_DE-eva_k-x_low.
 *
 *   PIPER_ROOT=$HOME/.local/share/acp-piper node scripts/piper-server.mjs
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.env.PIPER_ROOT || join(process.env.HOME || "/opt", ".local/share/acp-piper");
const bin = process.env.PIPER_BIN || join(root, "piper", "piper");
const port = Number(process.env.PIPER_PORT || 5000);
const host = process.env.PIPER_HOST || "0.0.0.0";

const voices = {
  "de_DE-kerstin-low": join(root, "voices", "de_DE-kerstin-low.onnx"),
  "de_DE-eva_k-x_low": join(root, "voices", "de_DE-eva_k-x_low.onnx"),
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 20_000) {
        reject(new Error("zu groß"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(new Error("kein JSON"));
      }
    });
    req.on("error", reject);
  });
}

function speak(text, model) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, ["--model", model, "--output_file", "-"], { stdio: ["pipe", "pipe", "pipe"] });
    const out = [];
    const err = [];
    child.stdout.on("data", (chunk) => out.push(chunk));
    child.stderr.on("data", (chunk) => err.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(Buffer.concat(err).toString("utf8").slice(0, 200) || `piper ${code}`));
        return;
      }
      resolve(Buffer.concat(out));
    });
    child.stdin.end(text);
  });
}

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    const ready = existsSync(bin) && Object.values(voices).every((file) => existsSync(file));
    res.writeHead(ready ? 200 : 503, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: ready, voices: Object.keys(voices) }));
    return;
  }
  if (req.method !== "POST") {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: false }));
    return;
  }
  readBody(req)
    .then(async (body) => {
      const text = String(body.text ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
      const voice = voices[body.voice] ? body.voice : "de_DE-kerstin-low";
      if (text.length < 2) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ ok: false, detail: "Text fehlt." }));
        return;
      }
      const wav = await speak(text, voices[voice]);
      res.writeHead(200, { "content-type": "audio/wav", "cache-control": "no-store" });
      res.end(wav);
    })
    .catch((error) => {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, detail: error instanceof Error ? error.message : "Piper" }));
    });
});

server.listen(port, host, () => {
  console.log(`piper ${host}:${port}`);
});
