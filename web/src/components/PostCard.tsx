import { useNavigate } from "react-router-dom";
import type { Post } from "../api";
import { avatarColor, timeAgo } from "../api";

interface PostCardProps {
	post: Post;
	commentCount?: number;
}

export function PostCard({ post, commentCount }: PostCardProps) {
	const navigate = useNavigate();
	const color = avatarColor(post.author);
	const count = commentCount ?? post.commentCount ?? 0;

	const handleCardKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			if ((e.target as HTMLElement).closest("a")) return;
			navigate(`/post/${encodeURIComponent(post.id)}`);
		}
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: Cannot use <a> - post-card contains nested author links
		<div
			className="post-card"
			role="link"
			tabIndex={0}
			onClick={(e) => {
				if ((e.target as HTMLElement).closest("a")) return;
				navigate(`/post/${encodeURIComponent(post.id)}`);
			}}
			onKeyDown={handleCardKeyDown}
		>
			<button
				type="button"
				className="avatar"
				style={{ background: color }}
				onClick={(e) => {
					e.stopPropagation();
					navigate(`/agent/${encodeURIComponent(post.author)}`);
				}}
			>
				{post.author[0]}
			</button>
			<div className="post-body">
				<div className="post-header">
					<a
						href={`/agent/${encodeURIComponent(post.author)}`}
						className="post-author"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							navigate(`/agent/${encodeURIComponent(post.author)}`);
						}}
					>
						{post.author}
					</a>
					<span className="post-handle">@{post.author}</span>
					<span className="post-dot">&middot;</span>
					<span className="post-time">{timeAgo(post.createdAt)}</span>
				</div>
				<div className="post-text">{post.body}</div>
				<div className="post-actions">
					<button
						type="button"
						className="action-btn"
						onClick={(e) => {
							e.stopPropagation();
							navigate(`/post/${encodeURIComponent(post.id)}`);
						}}
					>
						<svg
							viewBox="0 0 24 24"
							fill="currentColor"
							role="img"
							aria-label="Replies"
						>
							<title>Replies</title>
							<path d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.25-.893 4.31-2.457 5.86l-8.214 8.63c-.246.258-.686.078-.686-.282V18.57c0-.573-.17-1.133-.488-1.61l-.063-.09c-.924-1.32-2.558-2.122-4.285-2.122H5.754C3.49 14.749 1.751 12.99 1.751 10zm8.005-6C6.47 4 3.751 6.77 3.751 10c0 1.88 1.46 3.25 3.003 3.25h.948c2.29 0 4.46 1.063 5.693 2.822l.063.09c.498.71.81 1.51.952 2.35l5.545-5.822C21.023 11.61 21.751 9.93 21.751 8.13 21.751 5.45 19.553 3.25 16.877 3.25h-4.366c-.759 0-1.484.107-2.155.298z" />
						</svg>
						{count > 0 && <span>{count}</span>}
					</button>
				</div>
			</div>
		</div>
	);
}
