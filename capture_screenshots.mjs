/* Module 2 -- script to start local server and capture Chrome headless screenshots
 * of web viewer with CVD filter OFF and ON for docs/img/ */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PORT = 8085;
const MIME = {
  ".html": "text/html",
  ".mjs":  "text/javascript",
  ".js":   "text/javascript",
  ".css":  "text/css",
  ".json": "application/json",
  ".png":  "image/png",
  ".ppm":  "image/x-portable-pixmap"
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = parsedUrl.pathname;
  if (pathname === "/") pathname = "/web/index.html";
  if (pathname === "/web/") pathname = "/web/index.html";
  const filePath = path.join(process.cwd(), pathname);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found: " + pathname);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const targets = [
    { url: `http://localhost:${PORT}/web/?plan=myplan.json`, out: "docs/img/viewer_normal.png" },
    { url: `http://localhost:${PORT}/web/?plan=myplan.json&cvd=deuteranopia`, out: "docs/img/viewer_deuteranopia.png" },
    { url: `http://localhost:${PORT}/web/?plan=myplan.json&cvd=protanopia`, out: "docs/img/viewer_protanopia.png" }
  ];

  for (const t of targets) {
    console.log(`Capturing ${t.url} -> ${t.out}...`);
    try {
      await execFileAsync(chromePath, [
        "--headless=new",
        "--disable-gpu",
        `--screenshot=${path.resolve(t.out)}`,
        "--window-size=1200,800",
        "--virtual-time-budget=3000",
        t.url
      ]);
      const sz = fs.statSync(t.out).size;
      console.log(`  Saved ${t.out} (${sz} bytes)`);
    } catch (e) {
      console.error(`  Error capturing ${t.out}:`, e.message);
    }
  }

  server.close(() => {
    console.log("Server closed. All screenshots captured.");
    process.exit(0);
  });
});
