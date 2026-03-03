import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import {
	type Llama,
	type LlamaContext,
	type LlamaModel,
	getLlama,
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

async function generate(prompt: string): Promise<string> {
	if (!context) throw new Error("LLM not initialized");

	const { LlamaChatSession } = await import("node-llama-cpp");
	const sequence = context.getSequence();
	const session = new LlamaChatSession({
		contextSequence: sequence,
		systemPrompt:
			"/no_think\nYou are a creative writing assistant. Be concise. Never use markdown formatting. Never wrap output in code fences. Output plain text only.",
	});

	try {
		const result = await session.prompt(prompt, {
			maxTokens: 200,
			temperature: 0.9,
		});
		return cleanOutput(result);
	} finally {
		sequence.dispose();
	}
}

function cleanOutput(text: string): string {
	let cleaned = text
		.replace(/<think>[\s\S]*?<\/think>/g, "")
		.replace(/```[\s\S]*?```/g, "")
		.replace(/```\w*/g, "")
		.trim();

	// Remove leading JSON-like noise if the output starts with {
	if (cleaned.startsWith("{") && !cleaned.endsWith("}")) {
		const braceEnd = cleaned.indexOf("}");
		if (braceEnd > 0) cleaned = cleaned.slice(braceEnd + 1).trim();
	}

	return cleaned;
}

const NAME_POOL = [
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
];

const PERSONALITY_SEEDS = [
	"who debates tech ethics over coffee",
	"obsessed with retro video games and synthwave music",
	"who finds beauty in math and writes poetry about fractals",
	"a foodie traveler documenting street food around the world",
	"who believes aliens already walk among us",
	"an amateur astronomer tracking comets from the backyard",
	"who collects vinyl records and argues about audio quality",
	"a philosophy nerd who questions everything",
	"who paints landscapes and rants about modern art",
	"a night owl who thrives in the chaos of late-night coding",
];

export async function generateIdentity(): Promise<{
	name: string;
	personality: string;
}> {
	const seed = NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];
	const suffix = randomBytes(2).toString("hex");
	const pSeed =
		PERSONALITY_SEEDS[Math.floor(Math.random() * PERSONALITY_SEEDS.length)];

	const raw = await generate(
		`Invent a unique fictional social media persona ${pSeed}. Reply with ONLY a JSON object with "name" and "personality" fields. The name must be a single creative lowercase word. Example format: {"name":"${seed}${suffix}","personality":"A ..."}`,
	);

	try {
		const jsonStr = extractJSON(raw);
		const parsed = JSON.parse(jsonStr);
		if (parsed.name && parsed.personality) {
			let name = String(parsed.name)
				.toLowerCase()
				.replace(/[^a-z0-9]/g, "");
			if (name.length < 3) name = `${seed}${suffix}`;
			return {
				name: name.slice(0, 16),
				personality: String(parsed.personality).slice(0, 200),
			};
		}
	} catch {
		// fallback below
	}

	return {
		name: `${seed}${suffix}`,
		personality: `A creative soul ${pSeed}.`,
	};
}

export async function generatePost(
	agentName: string,
	personality: string,
): Promise<string> {
	const topics = [
		"technology",
		"nature",
		"philosophy",
		"food",
		"music",
		"space",
		"books",
		"art",
		"science",
		"travel",
		"movies",
		"sports",
		"weather",
		"dreams",
		"history",
	];
	const topic = topics[Math.floor(Math.random() * topics.length)];
	const result = await generate(
		`You are ${agentName}, a social media user. ${personality} Write a short, original social media post about ${topic}. 1-3 sentences. Be creative and opinionated. Plain text only.`,
	);
	if (!result || result.length < 10) {
		return `Thinking about ${topic} today. What a time to be alive on the decentralized web.`;
	}
	return result;
}

export async function generateComment(
	agentName: string,
	personality: string,
	postAuthor: string,
	postBody: string,
): Promise<string> {
	const result = await generate(
		`You are ${agentName}. ${personality} Reply to ${postAuthor}'s post: "${postBody.slice(0, 150)}" Write a short, conversational reply. 1-2 sentences. Plain text only.`,
	);
	if (!result || result.length < 5) {
		return `@${postAuthor} that's a really interesting take!`;
	}
	return result;
}

function extractJSON(text: string): string {
	const match = text.match(/\{[^}]*\}/);
	return match ? match[0] : text;
}

export function isLLMReady(): boolean {
	return context !== null;
}
