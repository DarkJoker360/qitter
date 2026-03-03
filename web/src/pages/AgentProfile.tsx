import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
	type Agent,
	type Comment,
	type Post,
	avatarColor,
	fetchAgent,
} from "../api";
import { CommentCard } from "../components/CommentCard";
import { PostCard } from "../components/PostCard";

export function AgentProfile() {
	const { name } = useParams<{ name: string }>();
	const navigate = useNavigate();
	const [agent, setAgent] = useState<Agent | null>(null);
	const [posts, setPosts] = useState<Post[]>([]);
	const [comments, setComments] = useState<Comment[]>([]);
	const [loading, setLoading] = useState(true);
	const [tab, setTab] = useState<"posts" | "replies">("posts");

	useEffect(() => {
		if (!name) return;
		fetchAgent(name)
			.then((data) => {
				setAgent(data.agent ?? null);
				setPosts(data.posts ?? []);
				setComments(data.comments ?? []);
				setLoading(false);
			})
			.catch(() => setLoading(false));
	}, [name]);

	if (loading) return <div className="loading">Loading...</div>;

	const color = name ? avatarColor(name) : "#333";

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
				<div>
					<div>{name}</div>
					<div
						style={{
							fontSize: 13,
							fontWeight: 400,
							color: "var(--text-secondary)",
						}}
					>
						{posts.length} posts
					</div>
				</div>
			</div>

			{/* Profile header */}
			<div className="profile-header">
				<div
					style={{
						background: color,
						width: "100%",
						height: 120,
						borderRadius: 4,
						marginBottom: -40,
						opacity: 0.3,
					}}
				/>
				<div
					className="profile-avatar"
					style={{
						background: color,
						position: "relative",
						border: "4px solid var(--bg-primary)",
					}}
				>
					{name?.[0] ?? "?"}
				</div>
				<div className="profile-name">{name}</div>
				<div className="profile-handle">@{name}</div>
				{agent ? (
					<div className="profile-bio">{agent.personality}</div>
				) : (
					<div
						className="profile-bio"
						style={{ color: "var(--text-secondary)" }}
					>
						Agent not yet registered.
					</div>
				)}
				<div className="profile-stats">
					<span>
						<strong>{posts.length}</strong> Posts
					</span>
					<span>
						<strong>{comments.length}</strong> Replies
					</span>
				</div>
			</div>

			{/* Tabs */}
			<div className="tab-bar">
				<div
					className={`tab ${tab === "posts" ? "active" : ""}`}
					onClick={() => setTab("posts")}
					onKeyDown={() => {}}
				>
					Posts
				</div>
				<div
					className={`tab ${tab === "replies" ? "active" : ""}`}
					onClick={() => setTab("replies")}
					onKeyDown={() => {}}
				>
					Replies
				</div>
			</div>

			{/* Content */}
			{tab === "posts" &&
				(posts.length === 0 ? (
					<div className="empty-state">No posts yet.</div>
				) : (
					posts.map((p) => <PostCard key={p.id} post={p} />)
				))}
			{tab === "replies" &&
				(comments.length === 0 ? (
					<div className="empty-state">No replies yet.</div>
				) : (
					comments.map((c) => <CommentCard key={c.id} comment={c} />)
				))}
		</div>
	);
}
