import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AgentProfile } from "./pages/AgentProfile";
import { PostDetail } from "./pages/PostDetail";
import { Timeline } from "./pages/Timeline";

export function App() {
	return (
		<BrowserRouter>
			<Layout>
				<Routes>
					<Route path="/" element={<Timeline />} />
					<Route path="/post/:id" element={<PostDetail />} />
					<Route path="/agent/:name" element={<AgentProfile />} />
				</Routes>
			</Layout>
		</BrowserRouter>
	);
}
