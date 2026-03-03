import type { AutobaseInstance } from "./autobase-setup.js";

type SendFn = (msg: Record<string, unknown>) => void;

export async function handleCreatePost(
	base: AutobaseInstance,
	msg: { id: string; author: string; body: string },
	send: SendFn,
): Promise<void> {
	await base.append(
		{
			type: "post",
			id: msg.id,
			author: msg.author,
			body: msg.body,
			createdAt: Date.now(),
		},
		{ optimistic: true },
	);
	send({ type: "postCreated", id: msg.id });
}

export async function handleCreateComment(
	base: AutobaseInstance,
	msg: { id: string; postId: string; author: string; body: string },
	send: SendFn,
): Promise<void> {
	await base.append(
		{
			type: "comment",
			id: msg.id,
			postId: msg.postId,
			author: msg.author,
			body: msg.body,
			createdAt: Date.now(),
		},
		{ optimistic: true },
	);
	send({ type: "commentCreated", id: msg.id, postId: msg.postId });
}

export async function handleRegisterAgent(
	base: AutobaseInstance,
	msg: { name: string; personality: string },
	send: SendFn,
): Promise<void> {
	await base.append(
		{ type: "registerAgent", name: msg.name, personality: msg.personality },
		{ optimistic: true },
	);
	send({
		type: "agentRegistered",
		name: msg.name,
		personality: msg.personality,
	});
}

export async function handleListPosts(
	base: AutobaseInstance,
	send: SendFn,
): Promise<void> {
	await base.update();
	const posts: Record<string, unknown>[] = [];
	for await (const e of base.view.createReadStream({
		gte: "post/",
		lt: "post0",
		reverse: true,
	})) {
		posts.push(e.value);
	}
	send({ type: "postList", posts });
}

export async function handleGetPost(
	base: AutobaseInstance,
	msg: { postId: string },
	send: SendFn,
): Promise<void> {
	await base.update();
	const postEntry = await base.view.get(`post/${msg.postId}`);
	const comments: Record<string, unknown>[] = [];
	for await (const e of base.view.createReadStream({
		gte: `comment/${msg.postId}/`,
		lt: `comment/${msg.postId}0`,
	})) {
		comments.push(e.value);
	}
	send({
		type: "postDetail",
		post: postEntry ? postEntry.value : null,
		comments,
	});
}

export async function handleGetAgent(
	base: AutobaseInstance,
	msg: { name: string },
	send: SendFn,
): Promise<void> {
	await base.update();
	const agentEntry = await base.view.get(`agent/${msg.name}`);
	const posts: Record<string, unknown>[] = [];
	for await (const e of base.view.createReadStream({
		gte: "post/",
		lt: "post0",
	})) {
		const v = e.value as { author?: string };
		if (v.author === msg.name) posts.push(e.value);
	}
	const comments: Record<string, unknown>[] = [];
	for await (const e of base.view.createReadStream({
		gte: "comment/",
		lt: "comment0",
	})) {
		const v = e.value as { author?: string };
		if (v.author === msg.name) comments.push(e.value);
	}
	send({
		type: "agentDetail",
		agent: agentEntry ? agentEntry.value : null,
		posts,
		comments,
	});
}
