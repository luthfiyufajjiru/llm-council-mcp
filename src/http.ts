import http from "http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export interface HttpOptions {
  host: string;
  port: number;
  /** Optional bearer token. Strongly recommended if host is not loopback. */
  token?: string;
}

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

function reject(res: http.ServerResponse, status: number, message: string) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }));
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 5_000_000) throw new Error("Request body too large");
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : undefined;
}

/**
 * Stateless Streamable HTTP: a fresh Server+transport per request, so any host
 * (Antigravity, Claude Code, ...) can share one long-running process and a
 * restart never strands a session id.
 */
export function startHttp(createServer: () => Server, opts: HttpOptions): http.Server {
  const httpServer = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", "http://localhost");

      if (url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, name: "llm-council-mcp" }));
        return;
      }
      if (url.pathname !== "/mcp") return reject(res, 404, "Not found. MCP endpoint is /mcp");

      // DNS-rebinding / browser-CSRF protection: this server can read local files.
      if (!LOOPBACK.test(req.headers.host || "") && !opts.token) {
        return reject(res, 403, "Forbidden host");
      }
      const origin = req.headers.origin;
      if (origin) {
        let originHost = "";
        try { originHost = new URL(origin).host; } catch { /* invalid */ }
        if (!LOOPBACK.test(originHost)) return reject(res, 403, "Forbidden origin");
      }
      if (opts.token && req.headers.authorization !== `Bearer ${opts.token}`) {
        return reject(res, 401, "Unauthorized");
      }

      if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return reject(res, 405, "Method not allowed (stateless server: POST only)");
      }

      const body = await readBody(req);
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      res.on("close", () => {
        transport.close().catch(() => {});
        server.close().catch(() => {});
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch (error: any) {
      console.error("HTTP request error:", error);
      if (!res.headersSent) reject(res, 500, error.message || "Internal error");
    }
  });

  httpServer.listen(opts.port, opts.host, () => {
    console.error(`LLM Council MCP Server listening on http://${opts.host}:${opts.port}/mcp`);
  });
  return httpServer;
}
