import type { WorkerIPC } from "./ipc.js";
import type { AppState } from "./state.js";

export function startServer(
	state: AppState,
	ipc: WorkerIPC,
	port: number,
): void {
	Bun.serve({
		port,
		idleTimeout: 255,
		async fetch(req) {
			const url = new URL(req.url);
			const path = url.pathname;

			if (path === "/api/events") {
				return handleSSE(state);
			}

			if (path === "/api/posts" && req.method === "GET") {
				return json(state.getPostsWithCounts());
			}

			const postMatch = path.match(/^\/api\/posts\/(.+)$/);
			if (postMatch && req.method === "GET") {
				const postId = decodeURIComponent(postMatch[1]);
				ipc.send({ type: "getPost", postId });
				try {
					const detail = await ipc.waitFor("postDetail", 5000);
					return json(detail);
				} catch {
					return json(state.getPostWithComments(postId));
				}
			}

			const agentMatch = path.match(/^\/api\/agents\/(.+)$/);
			if (agentMatch && req.method === "GET") {
				const name = decodeURIComponent(agentMatch[1]);
				ipc.send({ type: "getAgent", name });
				try {
					const detail = await ipc.waitFor("agentDetail", 5000);
					return json(detail);
				} catch {
					return json(state.getAgentProfile(name));
				}
			}

			// Serve static files from web/dist for production
			if (path === "/" || path === "/index.html") {
				const file = Bun.file("web/dist/index.html");
				if (await file.exists()) {
					return new Response(file, {
						headers: { "Content-Type": "text/html" },
					});
				}
				return new Response(
					"Qitter API running. Build the web app with: bun run build:web",
					{
						status: 200,
					},
				);
			}

			// Try serving static assets from web/dist
			const staticFile = Bun.file(`web/dist${path}`);
			if (await staticFile.exists()) {
				return new Response(staticFile);
			}

			// SPA fallback for client-side routing
			if (!path.startsWith("/api/")) {
				const indexFile = Bun.file("web/dist/index.html");
				if (await indexFile.exists()) {
					return new Response(indexFile, {
						headers: { "Content-Type": "text/html" },
					});
				}
			}

			return json({ error: "Not found" }, 404);
		},
	});

	console.log(`[Server] Listening on http://localhost:${port}`);
}

function handleSSE(state: AppState): Response {
	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();

			const sendEvent = (event: string, data: string) => {
				try {
					controller.enqueue(
						encoder.encode(`event: ${event}\ndata: ${data}\n\n`),
					);
				} catch {
					state.removeSSEClient(sendEvent);
				}
			};

			state.addSSEClient(sendEvent);

			controller.enqueue(encoder.encode(": connected\n\n"));
		},
		cancel() {
			// client disconnected, cleanup handled by try/catch in sendEvent
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
			"Access-Control-Allow-Origin": "*",
		},
	});
}

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	});
}
