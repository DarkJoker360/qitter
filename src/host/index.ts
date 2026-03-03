import { createHash } from "node:crypto";
import { resolve } from "node:path";
import type { WorkerToHostMsg } from "../types.js";
import { AgentRunner } from "./agent.js";
import { WorkerIPC } from "./ipc.js";
import { startServer } from "./server.js";
import { AppState } from "./state.js";

const peerId = process.env.PEER_ID ?? "1";
const topicSeed = process.env.TOPIC ?? "qitter-default-network";
const topic = createHash("sha256").update(topicSeed).digest("hex");
const bootstrapKey = process.env.BOOTSTRAP_KEY ?? null;
const port = Number(process.env.PORT ?? 3000);
const storageDir = resolve(process.cwd(), `.storage/peer-${peerId}`);
const serveWeb = process.env.SERVE_WEB !== "false";

console.log(`[Peer ${peerId}] Starting`);
console.log(`[Peer ${peerId}] Storage: ${storageDir}`);

const state = new AppState();
const ipc = new WorkerIPC(resolve(process.cwd(), "dist/worker.js"));

ipc.onMessage((msg: WorkerToHostMsg) => {
	switch (msg.type) {
		case "postAdded":
			state.addPost(msg.post);
			break;
		case "commentAdded":
			state.addComment(msg.comment);
			break;
		case "peerEvent":
			console.log(`[Peer ${peerId}] P2P: ${msg.event}`);
			break;
		case "error":
			console.error(`[Peer ${peerId}] Worker Error: ${msg.message}`);
			break;
	}
});

async function main(): Promise<void> {
	await ipc.waitFor("isWaiting", 15000);

	const isFirstPeer = peerId === "1" && !bootstrapKey;

	ipc.send({
		type: "initWorker",
		storageDir,
		bootstrapKey: isFirstPeer ? null : bootstrapKey,
		topic,
	});

	const ready = await ipc.waitFor("isReady", 60000);
	console.log(`[Peer ${peerId}] Worker ready. Indexer: ${ready.isIndexer}`);

	// Emit machine-readable line for the launcher to parse
	if (isFirstPeer) {
		console.log(`BOOTSTRAP_KEY=${ready.baseKey}`);
	}

	if (serveWeb) {
		startServer(state, ipc, port);
		console.log(`[Peer ${peerId}] Web UI: http://localhost:${port}`);
	}

	const agent = new AgentRunner(ipc, state);
	await agent.start();

	process.on("SIGINT", () => {
		agent.stop();
		ipc.destroy();
		process.exit(0);
	});

	process.on("SIGTERM", () => {
		agent.stop();
		ipc.destroy();
		process.exit(0);
	});
}

main().catch((err) => {
	console.error(`[Peer ${peerId}] Fatal:`, err);
	ipc.destroy();
	process.exit(1);
});
