/* Module 2 -- render Three.js viewer headless using Chrome and export out/plan_three.png and out/plan_three.ppm */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PNG } from "pngjs";
import { Framebuffer } from "./raster.mjs";

const execFileAsync = promisify(execFile);
const PORT = 8086;
fs.mkdirSync("out", { recursive: true });

const MIME = {
  ".html": "text/html",
  ".mjs":  "text/javascript",
  ".js":   "text/javascript",
  ".css":  "text/css",
  ".json": "application/json",
  ".png":  "image/png",
  ".ppm":  "image/x-portable-pixmap"
};

let server;

function convertPngToPpm(pngBuffer, ppmPath) {
  const png = PNG.sync.read(pngBuffer);
  const fb = new Framebuffer(png.width, png.height);
  for (let p = 0; p < png.width * png.height; p++) {
    fb.data[p * 3]     = png.data[p * 4];
    fb.data[p * 3 + 1] = png.data[p * 4 + 1];
    fb.data[p * 3 + 2] = png.data[p * 4 + 2];
  }
  fb.writePPM(ppmPath);
  console.log(`Converted to ${ppmPath} (${fb.w}x${fb.h})`);
}

server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/upload_plan_three") {
    let body = "";
    req.on("data", chunk => { body += chunk; });
    req.on("end", () => {
      const match = body.match(/^data:image\/png;base64,(.*)$/);
      if (match) {
        const buf = Buffer.from(match[1], "base64");
        fs.writeFileSync("out/plan_three.png", buf);
        console.log(`Saved out/plan_three.png (${buf.length} bytes)`);
        convertPngToPpm(buf, "out/plan_three.ppm");
      }
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");
      setTimeout(() => {
        server.close(() => {
          console.log("Export complete. Server closed.");
          process.exit(0);
        });
      }, 500);
    });
    return;
  }

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
  console.log(`Headless Three.js export server on port ${PORT}`);
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const url = `http://localhost:${PORT}/web/?plan=myplan.json&autoupload=true`;
  console.log(`Launching Chrome headless to render Three.js...`);
  try {
    await execFileAsync(chromePath, [
      "--headless=new",
      "--disable-gpu",
      "--window-size=1200,900",
      "--virtual-time-budget=4000",
      url
    ]);
  } catch (e) {
    console.error("Chrome finished with:", e.message);
  }
});
