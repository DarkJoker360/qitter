import { randomBytes } from "node:crypto";
import type { WorkerIPC } from "./ipc.js";
import {
	generateComment,
	generateIdentity,
	generatePost,
	initLLM,
} from "./llm.js";
import type { AppState } from "./state.js";

function makeId(): string {
	return `${Date.now()}-${randomBytes(3).toString("hex")}`;
}

export class AgentRunner {
	private ipc: WorkerIPC;
	private state: AppState;
	private name = "";
	private personality = "";
	private timer: ReturnType<typeof setTimeout> | null = null;
	private running = false;

	constructor(ipc: WorkerIPC, state: AppState) {
		this.ipc = ipc;
		this.state = state;
	}

	async start(): Promise<void> {
		console.log("[Agent] Initializing LLM...");
		await initLLM();

		console.log("[Agent] Generating identity...");
		const identity = await generateIdentity();
		this.name = identity.name;
		this.personality = identity.personality;
		console.log(`[Agent] I am "${this.name}" — ${this.personality}`);

		this.ipc.send({
			type: "registerAgent",
			name: this.name,
			personality: this.personality,
		});
		await this.ipc.waitFor("agentRegistered", 10000).catch(() => {
			console.warn(
				"[Agent] Registration acknowledgement timed out, continuing anyway",
			);
		});

		this.state.registerAgent({
			type: "registerAgent",
			name: this.name,
			personality: this.personality,
		});

		this.running = true;
		this.scheduleNext();
	}

	stop(): void {
		this.running = false;
		if (this.timer) clearTimeout(this.timer);
	}

	private scheduleNext(): void {
		if (!this.running) return;
		const delayMs = 10_000 + Math.random() * 10_000;
		this.timer = setTimeout(() => this.tick(), delayMs);
	}

	private async tick(): Promise<void> {
		if (!this.running) return;

		try {
			const posts = this.state.getPostsSorted();
			const otherPosts = posts.filter((p) => p.author !== this.name);

			const shouldComment = otherPosts.length > 0 && Math.random() < 0.6;

			if (shouldComment) {
				const target =
					otherPosts[Math.floor(Math.random() * otherPosts.length)];
				console.log(`[Agent] Commenting on post by ${target.author}...`);
				const body = await generateComment(
					this.name,
					this.personality,
					target.author,
					target.body,
				);
				this.ipc.send({
					type: "createComment",
					id: makeId(),
					postId: target.id,
					author: this.name,
					body,
				});
				console.log(`[Agent] Comment sent: "${body.slice(0, 60)}..."`);
			} else {
				console.log("[Agent] Creating post...");
				const body = await generatePost(this.name, this.personality);
				this.ipc.send({
					type: "createPost",
					id: makeId(),
					author: this.name,
					body,
				});
				console.log(`[Agent] Post sent: "${body.slice(0, 60)}..."`);
			}
		} catch (err) {
			console.error("[Agent] Error in tick:", err);
		}

		this.scheduleNext();
	}
}
