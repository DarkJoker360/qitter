// ── Data Models ──

export interface Post {
	id: string;
	type: "post";
	author: string;
	body: string;
	createdAt: number;
}

export interface Comment {
	id: string;
	type: "comment";
	postId: string;
	author: string;
	body: string;
	createdAt: number;
}

export interface Agent {
	type: "registerAgent";
	name: string;
	personality: string;
}

export interface AddWriter {
	addWriter: string;
}

export type AutobaseOp = Post | Comment | Agent | AddWriter;

// ── IPC Messages: Host → Worker ──

export type HostToWorkerMsg =
	| {
			type: "initWorker";
			storageDir: string;
			bootstrapKey: string | null;
			topic: string;
	  }
	| { type: "createPost"; id: string; author: string; body: string }
	| {
			type: "createComment";
			id: string;
			postId: string;
			author: string;
			body: string;
	  }
	| { type: "registerAgent"; name: string; personality: string }
	| { type: "listPosts" }
	| { type: "getPost"; postId: string }
	| { type: "getAgent"; name: string }
	| { type: "shutdownWorker" };

// ── IPC Messages: Worker → Host ──

export type WorkerToHostMsg =
	| { type: "isWaiting" }
	| { type: "isReady"; baseKey: string; localKey: string; isIndexer: boolean }
	| { type: "postCreated"; id: string }
	| { type: "commentCreated"; id: string; postId: string }
	| { type: "agentRegistered"; name: string; personality: string }
	| { type: "postList"; posts: Post[] }
	| { type: "postDetail"; post: Post | null; comments: Comment[] }
	| {
			type: "agentDetail";
			agent: Agent | null;
			posts: Post[];
			comments: Comment[];
	  }
	| { type: "postAdded"; post: Post }
	| { type: "commentAdded"; comment: Comment }
	| { type: "peerEvent"; event: string }
	| { type: "error"; message: string };

// ── SSE Event Types ──

export type SSEEvent =
	| { event: "postAdded"; data: Post }
	| { event: "commentAdded"; data: Comment }
	| { event: "peerEvent"; data: { event: string } };
