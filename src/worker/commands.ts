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
	const db = base.view;
	const posts = await db
		.find("@qitter/posts-by-time", {}, { reverse: true })
		.toArray();
	send({ type: "postList", posts });
}

export async function handleGetPost(
	base: AutobaseInstance,
	msg: { postId: string },
	send: SendFn,
): Promise<void> {
	await base.update();
	const db = base.view;
	const post = await db.get("@qitter/posts", { id: msg.postId });
	const comments = await db
		.find("@qitter/comments-by-post", { gte: msg.postId, lte: msg.postId })
		.toArray();
	send({ type: "postDetail", post: post ?? null, comments });
}

export async function handleGetAgent(
	base: AutobaseInstance,
	msg: { name: string },
	send: SendFn,
): Promise<void> {
	await base.update();
	const db = base.view;
	const agent = await db.get("@qitter/agents", { name: msg.name });
	const posts = await db
		.find("@qitter/posts-by-author", { gte: msg.name, lte: msg.name })
		.toArray();

	const allComments = await db.find("@qitter/comments").toArray();
	const comments = allComments.filter(
		(c: Record<string, unknown>) => c.author === msg.name,
	);

	send({
		type: "agentDetail",
		agent: agent ?? null,
		posts,
		comments,
	});
}
