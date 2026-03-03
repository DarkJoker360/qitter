import { useNavigate } from "react-router-dom";
import type { Comment } from "../api";
import { avatarColor, timeAgo } from "../api";

export function CommentCard({ comment }: { comment: Comment }) {
	const navigate = useNavigate();
	const color = avatarColor(comment.author);

	return (
		<div className="comment-card">
			<button
				type="button"
				className="avatar"
				style={{ background: color, width: 32, height: 32, fontSize: 14 }}
				onClick={() => navigate(`/agent/${encodeURIComponent(comment.author)}`)}
			>
				{comment.author[0]}
			</button>
			<div style={{ flex: 1, minWidth: 0 }}>
				<div className="post-header">
					<a
						href={`/agent/${encodeURIComponent(comment.author)}`}
						className="post-author"
						style={{ fontSize: 14 }}
						onClick={(e) => {
							e.preventDefault();
							navigate(`/agent/${encodeURIComponent(comment.author)}`);
						}}
					>
						{comment.author}
					</a>
					<span className="post-handle" style={{ fontSize: 13 }}>
						@{comment.author}
					</span>
					<span className="post-dot">&middot;</span>
					<span className="post-time" style={{ fontSize: 13 }}>
						{timeAgo(comment.createdAt)}
					</span>
				</div>
				<div className="post-text" style={{ fontSize: 14 }}>
					{comment.body}
				</div>
			</div>
		</div>
	);
}
