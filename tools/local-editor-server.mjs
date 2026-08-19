import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.cwd());
const port = 4173;
const assetRoot = join(root, "assets", "user-content");
const mime = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json; charset=utf-8", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".webp":"image/webp", ".gif":"image/gif", ".mp3":"audio/mpeg", ".pdf":"application/pdf", ".svg":"image/svg+xml" };

function safePath(urlPath) {
  const relative = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "") || "index.html";
  const target = resolve(root, normalize(relative));
  return target.startsWith(root) ? target : null;
}
async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}
function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}
function safeName(name = "file") {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(-120);
}

createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/content") {
      const { data } = await body(req);
      if (!data || typeof data !== "object") return json(res, 400, { error: "Invalid content payload." });
      await writeFile(join(root, "site-data.js"), `window.RoomData = ${JSON.stringify(data, null, 2)};\n`, "utf8");
      return json(res, 200, { ok: true });
    }
    if (req.method === "POST" && req.url === "/api/upload") {
      const { folder = "misc", name, base64 } = await body(req);
      if (!base64 || typeof base64 !== "string") return json(res, 400, { error: "Missing file data." });
      const cleanFolder = safeName(folder) || "misc";
      const cleanName = safeName(name);
      const bytes = Buffer.from(base64, "base64");
      if (!bytes.length || bytes.length > 25 * 1024 * 1024) return json(res, 400, { error: "File must be between 1 byte and 25 MB." });
      const directory = join(assetRoot, cleanFolder);
      await mkdir(directory, { recursive: true });
      const fileName = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}-${cleanName}`;
      await writeFile(join(directory, fileName), bytes);
      return json(res, 200, { path: `assets/user-content/${cleanFolder}/${fileName}` });
    }
    if (req.method !== "GET" && req.method !== "HEAD") return json(res, 405, { error: "Method not allowed." });
    const file = safePath(req.url || "/");
    if (!file || !existsSync(file)) { res.writeHead(404); return res.end("Not found"); }
    const type = mime[extname(file).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    if (req.method === "HEAD") return res.end();
    res.end(await readFile(file));
  } catch (error) {
    console.error(error);
    json(res, 500, { error: error.message || "Server error." });
  }
}).listen(port, "127.0.0.1", () => console.log(`Local editor: http://127.0.0.1:${port}/admin.html`));