import {createServer} from "node:http";
import {createReadStream, statSync} from "node:fs";
import {resolve, sep, extname} from "node:path";
import {fileURLToPath} from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".webm": "video/webm"
};
const server = createServer((request, response) => {
  let target;
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    target = resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!target.startsWith(root + sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    if (!statSync(target).isFile()) throw new Error("not a file");
  } catch {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": types[extname(target)] || "application/octet-stream",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  createReadStream(target).pipe(response);
});
server.listen(4175, "127.0.0.1", () => process.stdout.write("faceswap QA server ready\n"));
