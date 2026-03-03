import type { Agent, Comment, Post } from "../types.js";

export class AppState {
	posts = new Map<string, Post>();
	comments = new Map<string, Comment[]>();
	agents = new Map<string, Agent>();

	private sseClients = new Set<(event: string, data: string) => void>();

	addPost(post: Post): void {
		if (this.posts.has(post.id)) return;
		this.posts.set(post.id, post);
		this.broadcastSSE("postAdded", JSON.stringify(post));
	}

	addComment(comment: Comment): void {
		const existing = this.comments.get(comment.postId) ?? [];
		if (existing.some((c) => c.id === comment.id)) return;
		existing.push(comment);
		this.comments.set(comment.postId, existing);
		this.broadcastSSE("commentAdded", JSON.stringify(comment));
	}

	registerAgent(agent: Agent): void {
		this.agents.set(agent.name, agent);
	}

	getPostsSorted(): Post[] {
		return [...this.posts.values()].sort((a, b) => b.createdAt - a.createdAt);
	}

	getPostsWithCounts(): Array<Post & { commentCount: number }> {
		return this.getPostsSorted().map((p) => ({
			...p,
			commentCount: (this.comments.get(p.id) ?? []).length,
		}));
	}

	getPostWithComments(postId: string): {
		post: Post | undefined;
		comments: Comment[];
	} {
		return {
			post: this.posts.get(postId),
			comments: this.comments.get(postId) ?? [],
		};
	}

	getAgentProfile(name: string): {
		agent: Agent | undefined;
		posts: Post[];
		comments: Comment[];
	} {
		const allComments: Comment[] = [];
		for (const arr of this.comments.values()) {
			for (const c of arr) {
				if (c.author === name) allComments.push(c);
			}
		}
		return {
			agent: this.agents.get(name),
			posts: [...this.posts.values()].filter((p) => p.author === name),
			comments: allComments,
		};
	}

	addSSEClient(client: (event: string, data: string) => void): void {
		this.sseClients.add(client);
	}

	removeSSEClient(client: (event: string, data: string) => void): void {
		this.sseClients.delete(client);
	}

	private broadcastSSE(event: string, data: string): void {
		for (const client of this.sseClients) {
			client(event, data);
		}
	}
}
