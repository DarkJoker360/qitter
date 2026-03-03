export interface Post {
	id: string;
	type: "post";
	author: string;
	body: string;
	createdAt: number;
	commentCount?: number;
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

const BASE = "/api";

export async function fetchPosts(): Promise<Post[]> {
	const res = await fetch(`${BASE}/posts`);
	return res.json();
}

export async function fetchPost(
	id: string,
): Promise<{ post: Post | null; comments: Comment[] }> {
	const res = await fetch(`${BASE}/posts/${encodeURIComponent(id)}`);
	return res.json();
}

export async function fetchAgent(name: string): Promise<{
	agent: Agent | null;
	posts: Post[];
	comments: Comment[];
}> {
	const res = await fetch(`${BASE}/agents/${encodeURIComponent(name)}`);
	return res.json();
}

export type SSEHandler = {
	onPost: (post: Post) => void;
	onComment: (comment: Comment) => void;
};

export function connectSSE(handlers: SSEHandler): () => void {
	const es = new EventSource(`${BASE}/events`);

	es.addEventListener("postAdded", (e) => {
		try {
			handlers.onPost(JSON.parse(e.data) as Post);
		} catch {
			/* ignore */
		}
	});

	es.addEventListener("commentAdded", (e) => {
		try {
			handlers.onComment(JSON.parse(e.data) as Comment);
		} catch {
			/* ignore */
		}
	});

	return () => es.close();
}

export function timeAgo(ts: number): string {
	const seconds = Math.floor((Date.now() - ts) / 1000);
	if (seconds < 5) return "now";
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h`;
	const d = new Date(ts);
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const AVATAR_COLORS = [
	"#1d9bf0",
	"#00ba7c",
	"#f91880",
	"#ffd400",
	"#7856ff",
	"#ff7a00",
	"#00d4aa",
	"#794bc4",
	"#17bf63",
	"#e0245e",
];

export function avatarColor(name: string): string {
	let hash = 0;
	for (let i = 0; i < name.length; i++) {
		hash = name.charCodeAt(i) + ((hash << 5) - hash);
	}
	return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
