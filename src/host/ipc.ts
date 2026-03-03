import { resolve } from "node:path";
import Sidecar from "bare-sidecar";
import type { HostToWorkerMsg, WorkerToHostMsg } from "../types.js";

type MessageHandler = (msg: WorkerToHostMsg) => void;

export class WorkerIPC {
	private sidecar: ReturnType<typeof createSidecar>;
	private buffer = "";
	private listeners: MessageHandler[] = [];

	constructor(workerPath: string) {
		this.sidecar = createSidecar(resolve(workerPath));

		this.sidecar.on("data", (chunk: Buffer) => {
			this.buffer += chunk.toString();
			const lines = this.buffer.split("\n");
			this.buffer = lines.pop() ?? "";
			for (const line of lines) {
				if (!line.trim()) continue;
				try {
					const msg = JSON.parse(line) as WorkerToHostMsg;
					for (const listener of this.listeners) {
						listener(msg);
					}
				} catch {
					console.error("[IPC] Invalid JSON from worker:", line);
				}
			}
		});

		if (this.sidecar.stderr) {
			this.sidecar.stderr.on("data", (data: Buffer) => {
				console.error("[Worker stderr]", data.toString());
			});
		}
	}

	send(msg: HostToWorkerMsg): void {
		this.sidecar.write(`${JSON.stringify(msg)}\n`);
	}

	onMessage(handler: MessageHandler): void {
		this.listeners.push(handler);
	}

	removeListener(handler: MessageHandler): void {
		this.listeners = this.listeners.filter((h) => h !== handler);
	}

	waitFor<T extends WorkerToHostMsg["type"]>(
		type: T,
		timeoutMs = 30000,
	): Promise<Extract<WorkerToHostMsg, { type: T }>> {
		return new Promise((resolve, reject) => {
			const timer = setTimeout(
				() => reject(new Error(`Timeout waiting for: ${type}`)),
				timeoutMs,
			);
			const handler = (msg: WorkerToHostMsg) => {
				if (msg.type === type) {
					clearTimeout(timer);
					this.removeListener(handler);
					resolve(msg as Extract<WorkerToHostMsg, { type: T }>);
				}
			};
			this.onMessage(handler);
		});
	}

	destroy(): void {
		this.send({ type: "shutdownWorker" });
		setTimeout(() => {
			try {
				(this.sidecar as { kill?: () => void }).kill?.();
				(this.sidecar as { destroy?: () => void }).destroy?.();
			} catch {
				// ignore cleanup errors
			}
		}, 300);
	}
}

function createSidecar(workerPath: string) {
	return new Sidecar(workerPath) as {
		write(data: string): void;
		on(event: "data", cb: (chunk: Buffer) => void): void;
		stderr?: { on(event: "data", cb: (data: Buffer) => void): void };
		kill?(): void;
		destroy?(): void;
	};
}
