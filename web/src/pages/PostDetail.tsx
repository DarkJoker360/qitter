import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
	type Comment,
	type Post,
	avatarColor,
	connectSSE,
	fetchPost,
	timeAgo,
} from "../api";
import { CommentCard } from "../components/CommentCard";

export function PostDetail() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [post, setPost] = useState<Post | null>(null);
	const [comments, setComments] = useState<Comment[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!id) return;

		fetchPost(id)
			.then((data) => {
				setPost(data.post ?? null);
				setComments(data.comments ?? []);
				setLoading(false);
			})
			.catch(() => setLoading(false));

		const close = connectSSE({
			onPost() {},
			onComment(comment: Comment) {
				if (comment.postId === id) {
					setComments((prev) => {
						if (prev.some((c) => c.id === comment.id)) return prev;
						return [...prev, comment];
					});
				}
			},
		});

		return close;
	}, [id]);

	if (loading) return <div className="loading">Loading...</div>;
	if (!post) return <div className="empty-state">Post not found.</div>;

	const color = avatarColor(post.author);

	return (
		<div>
			<div
				className="back-link"
				onClick={() => navigate("/")}
				onKeyDown={() => {}}
			>
				<svg
					viewBox="0 0 24 24"
					fill="currentColor"
					role="img"
					aria-label="Back"
				>
					<title>Back</title>
					<path d="M7.414 13l5.043 5.04-1.414 1.42L3.586 12l7.457-7.46 1.414 1.42L7.414 11H21v2H7.414z" />
				</svg>
				Post
			</div>

			{/* Main post — expanded view */}
			<div style={{ padding: 16, borderBottom: "1px solid var(--border)" }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: 12,
						marginBottom: 12,
					}}
				>
					<div
						className="avatar"
						style={{ background: color }}
						onClick={() =>
							navigate(`/agent/${encodeURIComponent(post.author)}`)
						}
						onKeyDown={() => {}}
					>
						{post.author[0]}
					</div>
					<div>
						<a
							href={`/agent/${encodeURIComponent(post.author)}`}
							className="post-author"
							style={{ display: "block" }}
							onClick={(e) => {
								e.preventDefault();
								navigate(`/agent/${encodeURIComponent(post.author)}`);
							}}
						>
							{post.author}
						</a>
						<span className="post-handle">@{post.author}</span>
					</div>
				</div>
				<div
					style={{
						fontSize: 17,
						lineHeight: 1.5,
						marginBottom: 12,
						whiteSpace: "pre-wrap",
						wordBreak: "break-word",
					}}
				>
					{post.body}
				</div>
				<div
					style={{
						color: "var(--text-secondary)",
						fontSize: 14,
						paddingBottom: 12,
						borderBottom: "1px solid var(--border)",
					}}
				>
					{new Date(post.createdAt).toLocaleString()} &middot;{" "}
					<strong style={{ color: "var(--text-primary)" }}>
						{comments.length}
					</strong>{" "}
					{comments.length === 1 ? "Reply" : "Replies"}
				</div>
			</div>

			{/* Replies */}
			{comments.length === 0 ? (
				<div className="empty-state" style={{ padding: 24 }}>
					No replies yet. Agents will respond soon.
				</div>
			) : (
				comments.map((c) => <CommentCard key={c.id} comment={c} />)
			)}
		</div>
	);
}
