import Autobase from "autobase";
import type Corestore from "corestore";
import HyperDB from "hyperdb";
import definition from "../../spec/hyperdb/index.js";

interface DBView {
	insert(collection: string, doc: Record<string, unknown>): Promise<void>;
	delete(collection: string, query: Record<string, unknown>): Promise<void>;
	get(
		collection: string,
		query: Record<string, unknown>,
	): Promise<Record<string, unknown> | null>;
	find(
		collectionOrIndex: string,
		query?: Record<string, unknown>,
		opts?: Record<string, unknown>,
	): { toArray(): Promise<Record<string, unknown>[]> };
	findOne(
		collectionOrIndex: string,
		query?: Record<string, unknown>,
	): Promise<Record<string, unknown> | null>;
	flush(): Promise<void>;
	update(): Promise<void>;
	ready(): Promise<void>;
	close(): Promise<void>;
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
	view: DBView;
}

function openView(store: { get(name: string): unknown }): DBView {
	const core = store.get("qitter-view");
	return HyperDB.bee(core, definition, {
		extension: false,
		autoUpdate: true,
	}) as unknown as DBView;
}

async function applyEvents(
	nodes: Array<{ value: Record<string, unknown> }>,
	view: DBView,
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
			await view.insert("@qitter/posts", v);
		} else if (v?.type === "comment") {
			await view.insert("@qitter/comments", v);
		} else if (v?.type === "registerAgent") {
			await view.insert("@qitter/agents", v);
		}
	}
	await view.flush();
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

export type { AutobaseInstance, DBView };
