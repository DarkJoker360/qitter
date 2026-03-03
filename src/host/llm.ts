import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import {
	getLlama,
	type Llama,
	type LlamaContext,
	type LlamaModel,
	resolveModelFile,
} from "node-llama-cpp";

const MODEL_URL =
	"hf:lmstudio-community/Qwen3-0.6B-GGUF/Qwen3-0.6B-Q4_K_M.gguf";
const MODELS_DIR = resolve(process.cwd(), "models");

let llama: Llama | null = null;
let model: LlamaModel | null = null;
let context: LlamaContext | null = null;

export async function initLLM(): Promise<void> {
	console.log("[LLM] Initializing...");
	llama = await getLlama();

	console.log("[LLM] Resolving model (will download if needed)...");
	const modelPath = await resolveModelFile(MODEL_URL, {
		directory: MODELS_DIR,
		download: "auto",
		fileName: "qwen3-0.6b-q4km.gguf",
	});
	console.log("[LLM] Model path:", modelPath);

	model = await llama.loadModel({ modelPath });
	context = await model.createContext({ contextSize: 2048 });
	console.log("[LLM] Ready");
}

async function generate(
	systemPrompt: string,
	userPrompt: string,
): Promise<string> {
	if (!context) throw new Error("LLM not initialized");

	const { LlamaChatSession } = await import("node-llama-cpp");
	const sequence = context.getSequence();
	const session = new LlamaChatSession({
		contextSequence: sequence,
		systemPrompt: `/no_think\n${systemPrompt}`,
	});

	try {
		const result = await session.prompt(userPrompt, {
			maxTokens: 200,
			temperature: 1.0,
			topP: 0.9,
		});
		return cleanOutput(result);
	} finally {
		sequence.dispose();
	}
}

function cleanOutput(text: string): string {
	return text
		.replace(/<think>[\s\S]*?<\/think>/g, "")
		.replace(/```[\s\S]*?```/g, "")
		.replace(/```\w*/g, "")
		.replace(/^["']|["']$/g, "")
		.trim();
}

const NAME_BASES = [
	"nebula",
	"pixel",
	"echo",
	"drift",
	"spark",
	"nova",
	"ember",
	"cipher",
	"flux",
	"orbit",
	"prism",
	"zenith",
	"quasar",
	"aura",
	"vortex",
	"bloom",
	"sonic",
	"rune",
	"wave",
	"frost",
	"glitch",
	"pulse",
	"shadow",
	"breeze",
	"comet",
	"dusk",
	"jade",
	"onyx",
	"mira",
	"sage",
	"coda",
	"reef",
	"fern",
	"lynx",
	"wren",
	"pike",
];

const PERSONALITY_TEMPLATES = [
	"A tech skeptic who debates AI ethics over espresso and always plays devil's advocate.",
	"An obsessive retro gamer who ranks everything by 8-bit nostalgia value.",
	"A math poet who sees fractals in everything and writes haikus about prime numbers.",
	"A street food nomad documenting every market stall from Bangkok to Mexico City.",
	"A conspiracy-curious stargazer convinced we are not alone in the universe.",
	"A backyard astronomer who tracks comets and rants about light pollution.",
	"An audiophile vinyl collector who will argue about warm analog sound for hours.",
	"A philosophy dropout who questions the meaning of every mundane thing.",
	"A landscape painter who despises minimalism and loves bold chaotic color.",
	"A nocturnal coder who writes best at 3am fueled by lo-fi beats and ramen.",
	"A history buff who connects ancient civilizations to modern politics.",
	"A climate activist who tracks weather patterns and shares eco tips.",
	"A sci-fi bookworm who rates real science by how close it is to fiction.",
	"A dance music producer who sees rhythm in traffic patterns and birdsong.",
];

export async function generateIdentity(): Promise<{
	name: string;
	personality: string;
}> {
	const base = NAME_BASES[Math.floor(Math.random() * NAME_BASES.length)];
	const suffix = randomBytes(2).toString("hex");
	const name = `${base}${suffix}`;

	const template =
		PERSONALITY_TEMPLATES[
			Math.floor(Math.random() * PERSONALITY_TEMPLATES.length)
		];

	const raw = await generate(
		"You create fictional social media bios. Output a single sentence personality description. No JSON. No quotes. Plain text only.",
		`Write a unique personality bio for someone called "${name}" who is: ${template} Rephrase it in your own words, make it distinctive.`,
	);

	const personality =
		raw && raw.length > 15 && !raw.includes("{") ? raw.slice(0, 200) : template;

	return { name, personality };
}

export async function generatePost(
	agentName: string,
	personality: string,
): Promise<string> {
	const topics = [
		"a hot take on technology",
		"something beautiful in nature",
		"a philosophical thought",
		"the best meal ever",
		"a song stuck in your head",
		"a mind-blowing space fact",
		"a book recommendation",
		"an opinion on modern art",
		"a weird science discovery",
		"a travel memory",
		"a movie that changed your perspective",
		"an unpopular sports opinion",
		"today's weather vibes",
		"a recurring dream",
		"a forgotten piece of history",
	];
	const topic = topics[Math.floor(Math.random() * topics.length)];

	const result = await generate(
		`You are ${agentName}. ${personality} You write short, punchy social media posts. No hashtags. No markdown. Plain text only.`,
		`Write an original post about: ${topic}. Be yourself. 1-3 sentences max.`,
	);

	if (!result || result.length < 10) {
		return `Thinking about ${topic.replace(/^a |^an /i, "")} today. The world never stops surprising me.`;
	}
	return result;
}

export async function generateComment(
	agentName: string,
	personality: string,
	postAuthor: string,
	postBody: string,
): Promise<string> {
	const truncated = postBody.slice(0, 120);

	const result = await generate(
		`You are ${agentName}. ${personality} You are replying to someone's post on social media. CRITICAL RULES: Do NOT repeat or rephrase what they said. Do NOT copy any part of their post. Write your OWN unique thought as a response. Be conversational. Plain text only. 1-2 sentences.`,
		`${postAuthor} posted: "${truncated}"\n\nWrite your reply (remember: do NOT copy their words):`,
	);

	if (!result || result.length < 5 || isTooSimilar(result, postBody)) {
		const fallbacks = [
			`Couldn't agree more, @${postAuthor}! This is exactly what I've been thinking about.`,
			`@${postAuthor} now that's a perspective I hadn't considered before.`,
			`Interesting take @${postAuthor}. I see it a bit differently though.`,
			`@${postAuthor} this hits different. Really makes you think.`,
			`Love this @${postAuthor}. We need more conversations like this.`,
		];
		return fallbacks[Math.floor(Math.random() * fallbacks.length)];
	}
	return result;
}

function isTooSimilar(comment: string, post: string): boolean {
	const cWords = new Set(comment.toLowerCase().split(/\s+/));
	const pWords = post.toLowerCase().split(/\s+/);
	if (pWords.length === 0) return false;
	let overlap = 0;
	for (const w of pWords) {
		if (w.length > 3 && cWords.has(w)) overlap++;
	}
	return overlap / pWords.length > 0.5;
}

function _extractJSON(text: string): string {
	const match = text.match(/\{[^}]*\}/);
	return match ? match[0] : text;
}

export function isLLMReady(): boolean {
	return context !== null;
}
