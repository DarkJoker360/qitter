import c from "compact-encoding";
import type Corestore from "corestore";
import Hyperswarm from "hyperswarm";
import Protomux from "protomux";
import type { AutobaseInstance } from "./autobase-setup.js";

type SendFn = (msg: Record<string, unknown>) => void;

interface SwarmContext {
	swarm: InstanceType<typeof Hyperswarm>;
	waitForBootstrap: (() => Promise<Buffer>) | null;
}

export function setupSwarm(
	store: InstanceType<typeof Corestore>,
	topicHex: string,
	getBase: () => AutobaseInstance | null,
	send: SendFn,
): SwarmContext {
	const swarm = new Hyperswarm();
	const topicHash = Buffer.from(topicHex, "hex");
	const addedWriters = new Set<string>();

	let resolveDiscovery: ((key: Buffer) => void) | null = null;
	const bootstrapPromise = new Promise<Buffer>((resolve) => {
		resolveDiscovery = resolve;
	});

	swarm.join(topicHash, { client: true, server: true });

	swarm.on(
		"connection",
		(conn: NodeJS.ReadWriteStream & { remotePublicKey?: Buffer }) => {
			store.replicate(conn);
			send({ type: "peerEvent", event: "connected" });

			const mux = Protomux.from(conn);

			// Channel 1: Bootstrap key exchange
			let bMsg: { send(data: string): void } | null = null;
			const bCh = mux.createChannel({
				protocol: "qitter-bootstrap",
				onopen() {
					const b = getBase();
					if (b?.key) bMsg?.send(b.key.toString("hex"));
				},
			});
			if (bCh) {
				bMsg = bCh.addMessage({
					encoding: c.string,
					onmessage(keyHex: string) {
						if (keyHex.length === 64 && resolveDiscovery) {
							resolveDiscovery(Buffer.from(keyHex, "hex"));
							resolveDiscovery = null;
						}
					},
				});
				bCh.open();
			}

			// Channel 2: Writer key exchange
			let wMsg: { send(data: string): void } | null = null;
			const wCh = mux.createChannel({
				protocol: "qitter-writers",
				onopen() {
					const b = getBase();
					if (b?.local?.key) wMsg?.send(b.local.key.toString("hex"));
				},
			});
			if (wCh) {
				wMsg = wCh.addMessage({
					encoding: c.string,
					onmessage(peerKeyHex: string) {
						const b = getBase();
						if (!b || peerKeyHex.length !== 64 || addedWriters.has(peerKeyHex))
							return;
						addedWriters.add(peerKeyHex);
						store.get({ key: Buffer.from(peerKeyHex, "hex"), active: true });
						b.append({ addWriter: peerKeyHex }, { optimistic: true }).catch(
							() => {},
						);
					},
				});
				wCh.open();
			}
		},
	);

	return {
		swarm,
		waitForBootstrap: () => bootstrapPromise,
	};
}
