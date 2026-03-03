import Autobase from "autobase";
import type Corestore from "corestore";
import Hyperbee from "hyperbee";

interface HyperbeeView {
	put(key: string, value: Record<string, unknown>): Promise<void>;
	get(
		key: string,
	): Promise<{ key: string; value: Record<string, unknown> } | null>;
	createReadStream(opts: Record<string, unknown>): AsyncIterable<{
		key: string;
		value: Record<string, unknown>;
	}>;
}

interface AutobaseHost {
	addWriter(key: Buffer, opts: { indexer: boolean }): Promise<void>;
}

interface AutobaseInstance {
	ready(): Promise<void>;
	update(): Promise<void>;
	append(
		value: Record<string, unknown>,
		opts?: { optimistic: boolean },
	): Promise<void>;
	on(event: string, cb: (...args: unknown[]) => void): void;
	key: Buffer | null;
	discoveryKey: Buffer;
	local: { key: Buffer };
	isIndexer: boolean;
	view: HyperbeeView;
}

function openView(store: { get(name: string): unknown }): HyperbeeView {
	return new Hyperbee(store.get("qitter-view"), {
		keyEncoding: "utf-8",
		valueEncoding: "json",
		extension: false,
	}) as unknown as HyperbeeView;
}

async function applyEvents(
	nodes: Array<{ value: Record<string, unknown> }>,
	view: HyperbeeView,
	host: AutobaseHost,
): Promise<void> {
	for (const node of nodes) {
		const v = node.value;
		if (v && "addWriter" in v && typeof v.addWriter === "string") {
			await host.addWriter(Buffer.from(v.addWriter, "hex"), {
				indexer: true,
			});
			continue;
		}
		if (v?.type === "post") {
			await view.put(`post/${v.id}`, v);
		} else if (v?.type === "comment") {
			await view.put(`comment/${v.postId}/${v.id}`, v);
		} else if (v?.type === "registerAgent") {
			await view.put(`agent/${v.name}`, v);
		}
	}
}

export function createAutobase(
	store: InstanceType<typeof Corestore>,
	bootstrapKey: Buffer | null,
): AutobaseInstance {
	return new Autobase(store, bootstrapKey, {
		valueEncoding: "json",
		optimistic: true,
		ackInterval: 1000,
		open: openView,
		apply: applyEvents,
	}) as unknown as AutobaseInstance;
}

export type { AutobaseInstance, HyperbeeView };
