const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 8080);
const novelsPath = path.join(root, "data", "novels.json");
const backupPath = path.join(root, "data", "novels.backup.json");

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === "/api/novels") {
    await handleNovelsApi(req, res);
    return;
  }

  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.normalize(path.join(root, requested));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const body = await fs.readFile(filePath);
    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(body);
  } catch {
    const body = await fs.readFile(path.join(root, "index.html"));
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
  }
});

async function handleNovelsApi(req, res) {
  if (req.method === "GET") {
    try {
      const body = await fs.readFile(novelsPath, "utf8");
      sendJson(res, 200, JSON.parse(body));
    } catch {
      sendJson(res, 500, { error: "作品データを読み込めませんでした。" });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const body = await readRequestBody(req);
      const novels = JSON.parse(body);

      if (!Array.isArray(novels)) {
        sendJson(res, 400, { error: "作品データの形式が正しくありません。" });
        return;
      }

      const current = await fs.readFile(novelsPath, "utf8").catch(() => "");
      if (current) {
        await fs.writeFile(backupPath, current, "utf8");
      }
      await fs.writeFile(novelsPath, `${JSON.stringify(novels, null, 2)}\n`, "utf8");
      sendJson(res, 200, { ok: true });
    } catch {
      sendJson(res, 500, { error: "作品データを保存できませんでした。" });
    }
    return;
  }

  sendJson(res, 405, { error: "Method Not Allowed" });
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 20 * 1024 * 1024) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, value) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(value));
}

server.listen(port, () => {
  console.log(`ゆぼ文庫 Web Reader: http://localhost:${port}`);
});
