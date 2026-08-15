import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const root = path.resolve(".");
const types = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const candidate = path.resolve(root, `.${pathname}`);
    if (!candidate.startsWith(root)) throw new Error("Invalid path");
    const info = await stat(candidate);
    const file = info.isDirectory() ? path.join(candidate, "index.html") : candidate;
    response.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
    createReadStream(file).pipe(response);
  } catch {
    response.statusCode = 404;
    response.end("Not found");
  }
}).listen(4175, "127.0.0.1", () => console.log("Preview: http://127.0.0.1:4175"));
