/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS production entrypoint */
/**
 * Production entrypoint for Railway/Docker.
 * - Binds 0.0.0.0 (not localhost)
 * - Uses process.env.PORT (Railway injects this)
 * - Clears Docker-injected HOSTNAME (container id) so Next does not mis-bind
 */
const http = require("http");
const { parse } = require("url");
const next = require("next");

// Docker sets HOSTNAME to the container hostname; must not affect listen address.
delete process.env.HOSTNAME;

// Dockerfile ENV PORT=3000; Railway injects PORT at runtime (often 8080). Healthcheck uses :3000.
let port = Number.parseInt(process.env.PORT || "3000", 10);
if (port === 8080) {
  console.warn(
    "[nelvyon] PORT=8080 from Railway does not match service/healthcheck port 3000 — binding to 3000",
  );
  port = 3000;
}
const hostname = "0.0.0.0";

if (!Number.isFinite(port) || port <= 0) {
  console.error(`[nelvyon] Invalid PORT: ${process.env.PORT}`);
  process.exit(1);
}

const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

process.on("uncaughtException", (err) => {
  console.error("[nelvyon] uncaughtException", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[nelvyon] unhandledRejection", reason);
  process.exit(1);
});

app
  .prepare()
  .then(() => {
    const server = http.createServer((req, res) => {
      const parsedUrl = parse(req.url ?? "/", true);
      handle(req, res, parsedUrl).catch((err) => {
        console.error("[nelvyon] request error", req.method, req.url, err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end("Internal Server Error");
        }
      });
    });

    server.once("error", (err) => {
      console.error("[nelvyon] HTTP server error", err);
      process.exit(1);
    });

    server.listen(port, hostname, () => {
      console.log(
        `[nelvyon] Ready on http://${hostname}:${port} (PORT env=${process.env.PORT ?? "(unset)"}, NODE_ENV=${process.env.NODE_ENV})`,
      );
    });
  })
  .catch((err) => {
    console.error("[nelvyon] Failed to start Next.js", err);
    process.exit(1);
  });
