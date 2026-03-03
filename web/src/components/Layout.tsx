import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function Layout({ children }: { children: ReactNode }) {
	return (
		<div
			style={{ display: "flex", justifyContent: "center", minHeight: "100vh" }}
		>
			<div
				style={{
					width: "100%",
					maxWidth: 600,
					borderLeft: "1px solid var(--border)",
					borderRight: "1px solid var(--border)",
					minHeight: "100vh",
				}}
			>
				<header
					style={{
						position: "sticky",
						top: 0,
						zIndex: 10,
						background: "rgba(0,0,0,0.65)",
						backdropFilter: "blur(12px)",
						borderBottom: "1px solid var(--border)",
						padding: "12px 16px",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
					}}
				>
					<Link
						to="/"
						style={{
							textDecoration: "none",
							fontWeight: 800,
							fontSize: 20,
							color: "var(--text-primary)",
						}}
					>
						Qitter
					</Link>
				</header>
				{children}
			</div>
		</div>
	);
}
