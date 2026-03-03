import { resolve } from "node:path";
import { type Subprocess, spawn } from "bun";

const PEER_COUNT = Number(process.env.PEER_COUNT ?? "3");
const TOPIC = process.env.TOPIC ?? "qitter-default-network";
const BASE_PORT = Number(process.env.PORT ?? "3000");

const peerScript = resolve(import.meta.dir, "index.ts");
const children: Subprocess[] = [];

function spawnPeer(peerId: number, bootstrapKey: string | null): Subprocess {
	const env: Record<string, string> = {
		...(process.env as Record<string, string>),
		PEER_ID: String(peerId),
		TOPIC,
	};

	if (peerId === 1) {
		env.PORT = String(BASE_PORT);
		env.SERVE_WEB = "true";
	} else {
		env.SERVE_WEB = "false";
	}

	if (bootstrapKey) {
		env.BOOTSTRAP_KEY = bootstrapKey;
	}

	const child = spawn(["bun", peerScript], {
		env,
		stdout: "pipe",
		stderr: "inherit",
	});

	return child;
}

function prefixStream(
	stream: ReadableStream<Uint8Array>,
	prefix: string,
	onLine?: (line: string) => void,
): void {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	function pump(): void {
		reader
			.read()
			.then(({ done, value }) => {
				if (done) return;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() ?? "";
				for (const line of lines) {
					if (line.trim()) {
						console.log(`${prefix} ${line}`);
						onLine?.(line);
					}
				}
				pump();
			})
			.catch(() => {});
	}
	pump();
}

async function main(): Promise<void> {
	console.log(`[Launcher] Starting ${PEER_COUNT} agent peers...`);

	// --- Peer 1: creates the network ---
	const peer1 = spawnPeer(1, null);
	children.push(peer1);

	const bootstrapKey = await new Promise<string>((resolve, reject) => {
		const timeout = setTimeout(
			() => reject(new Error("Timed out waiting for peer 1 bootstrap key")),
			120_000,
		);

		prefixStream(
			peer1.stdout as ReadableStream<Uint8Array>,
			"[Peer 1]",
			(line) => {
				const match = line.match(/^BOOTSTRAP_KEY=([a-f0-9]{64})$/);
				if (match) {
					clearTimeout(timeout);
					resolve(match[1]);
				}
			},
		);
	});

	console.log(
		`[Launcher] Network created. Bootstrap: ${bootstrapKey.slice(0, 16)}...`,
	);
	console.log(`[Launcher] Web UI: http://localhost:${BASE_PORT}`);

	// --- Peers 2..N: join the existing network ---
	for (let i = 2; i <= PEER_COUNT; i++) {
		// Small stagger so peers don't all hit the DHT at once
		await new Promise((r) => setTimeout(r, 2000));

		console.log(`[Launcher] Starting peer ${i}...`);
		const peer = spawnPeer(i, bootstrapKey);
		children.push(peer);

		prefixStream(peer.stdout as ReadableStream<Uint8Array>, `[Peer ${i}]`);
	}

	console.log(`[Launcher] All ${PEER_COUNT} peers running. Ctrl+C to stop.`);

	const shutdown = () => {
		console.log("\n[Launcher] Shutting down all peers...");
		for (const child of children) {
			child.kill("SIGTERM");
		}
		setTimeout(() => process.exit(0), 2000);
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);

	// Keep alive — wait for peer 1 to exit
	await peer1.exited;
	shutdown();
}

main().catch((err) => {
	console.error("[Launcher] Fatal:", err);
	for (const child of children) {
		child.kill("SIGTERM");
	}
	process.exit(1);
});
