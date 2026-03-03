import Corestore from "corestore";
import { type AutobaseInstance, createAutobase } from "./autobase-setup.js";
import {
	handleCreateComment,
	handleCreatePost,
	handleGetAgent,
	handleGetPost,
	handleListPosts,
	handleRegisterAgent,
} from "./commands.js";
import { setupSwarm } from "./swarm.js";

declare const Bare: {
	IPC: {
		write(data: string): void;
		on(event: "data", cb: (chunk: Buffer) => void): void;
	};
};

const ipc = Bare.IPC;

function send(msg: Record<string, unknown>): void {
	ipc.write(`${JSON.stringify(msg)}\n`);
}

let base: AutobaseInstance | null = null;
let store: InstanceType<typeof Corestore> | null = null;

const seenPostIds = new Set<string>();
const seenCommentIds = new Set<string>();

function emitNewEntries(): void {
	if (!base) return;
	base
		.update()
		.then(async () => {
			if (!base) return;
			try {
				const db = base.view;
				await db.update();
				const posts = await db.find("@qitter/posts").toArray();
				for (const p of posts) {
					const v = p as { id: string };
					if (!seenPostIds.has(v.id)) {
						seenPostIds.add(v.id);
						send({ type: "postAdded", post: p });
					}
				}
				const comments = await db.find("@qitter/comments").toArray();
				for (const c of comments) {
					const v = c as { id: string };
					if (!seenCommentIds.has(v.id)) {
						seenCommentIds.add(v.id);
						send({ type: "commentAdded", comment: c });
					}
				}
			} catch {
				// view may not be ready yet
			}
		})
		.catch(() => {});
}

async function initWorker(msg: {
	storageDir: string;
	bootstrapKey: string | null;
	topic: string;
}): Promise<void> {
	store = new Corestore(msg.storageDir);
	await store.ready();

	let bootstrapKey: Buffer | null = null;
	if (msg.bootstrapKey) {
		bootstrapKey = Buffer.from(msg.bootstrapKey, "hex");
	}

	const isFirstPeer = !bootstrapKey && !msg.bootstrapKey;

	send({ type: "peerEvent", event: `creating autobase, first=${isFirstPeer}` });
	base = createAutobase(store, isFirstPeer ? null : bootstrapKey);
	await base.ready();
	send({ type: "peerEvent", event: "autobase ready" });

	// Self-add as writer
	await base.append(
		{ addWriter: base.local.key.toString("hex") },
		{ optimistic: true },
	);

	// Now setup swarm (after base is ready so getBase() returns a valid base)
	const ctx = setupSwarm(store, msg.topic, () => base, send);

	// Join autobase discovery key
	ctx.swarm.join(base.discoveryKey, { client: true, server: true });

	base.on("update", () => emitNewEntries());

	send({
		type: "isReady",
		baseKey: base.key?.toString("hex"),
		localKey: base.local.key.toString("hex"),
		isIndexer: base.isIndexer,
	});
}

function routeMessage(msg: Record<string, unknown>): void {
	const handler = async () => {
		try {
			switch (msg.type) {
				case "initWorker":
					await initWorker(
						msg as {
							storageDir: string;
							bootstrapKey: string | null;
							topic: string;
						},
					);
					break;
				case "createPost":
					if (base)
						await handleCreatePost(
							base,
							msg as { id: string; author: string; body: string },
							send,
						);
					break;
				case "createComment":
					if (base)
						await handleCreateComment(
							base,
							msg as {
								id: string;
								postId: string;
								author: string;
								body: string;
							},
							send,
						);
					break;
				case "registerAgent":
					if (base)
						await handleRegisterAgent(
							base,
							msg as { name: string; personality: string },
							send,
						);
					break;
				case "listPosts":
					if (base) await handleListPosts(base, send);
					break;
				case "getPost":
					if (base) await handleGetPost(base, msg as { postId: string }, send);
					break;
				case "getAgent":
					if (base) await handleGetAgent(base, msg as { name: string }, send);
					break;
				case "shutdownWorker":
					if (store) await store.close();
					break;
			}
		} catch (err) {
			const errObj = err instanceof Error ? err : new Error(String(err));
			send({
				type: "error",
				message: `${errObj.message}\n${errObj.stack ?? ""}`,
			});
		}
	};
	handler();
}

// IPC receive loop
let buf = "";
ipc.on("data", (chunk: Buffer) => {
	buf += chunk.toString();
	const lines = buf.split("\n");
	buf = lines.pop() ?? "";
	for (const line of lines) {
		if (!line.trim()) continue;
		try {
			const msg = JSON.parse(line);
			routeMessage(msg);
		} catch {
			send({ type: "error", message: `Invalid JSON: ${line}` });
		}
	}
});

send({ type: "isWaiting" });
