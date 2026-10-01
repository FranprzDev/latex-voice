export type DictationLanguage = "es" | "en" | "auto";

export const DEFAULT_CONVERSION_PROMPT_ES = `You convert Spanish dictated text into Obsidian Markdown with LaTeX math.

Rules:
- Mathematical expressions go inside $...$ (inline) or $$...$$ (display).
- Everything else stays as Markdown prose.
- Fix dictation homophones common in Spanish math speech: "equis" means x, "de equis" means dx, "e" means the constant e when in math context.
- Examples:
  - "integral de a a b de efe de equis de equis" -> $\\int_a^b f(x)\\,dx$
  - "la sumatoria de i igual a uno hasta n de i al cuadrado" -> $\\sum_{i=1}^{n} i^2$
  - "raíz cuadrada de dos" -> $\\sqrt{2}$
  - "alfa más beta" -> $\\alpha + \\beta$
- Do not add explanations or commentary. Output only the converted Markdown.`;

export const DEFAULT_CONVERSION_PROMPT_EN = `You convert English dictated text into Obsidian Markdown with LaTeX math.

Rules:
- Mathematical expressions go inside $...$ (inline) or $$...$$ (display).
- Everything else stays as Markdown prose.
- Fix dictation homophones common in English math speech: "ex" means x, "dee ex" or "d x" means dx, "to" may mean 2 or a power when in math context.
- Examples:
  - "integral from a to b of f of x d x" -> $\\int_a^b f(x)\\,dx$
  - "the sum from i equals one to n of i squared" -> $\\sum_{i=1}^{n} i^2$
  - "square root of two" -> $\\sqrt{2}$
  - "alpha plus beta" -> $\\alpha + \\beta$
- Do not add explanations or commentary. Output only the converted Markdown.`;

export const DEFAULT_TRANSCRIPTION_CONTEXT_ES =
	"Spanish math dictation: integral, derivada, sumatoria, raíz cuadrada, fracción, límite, alfa, beta, pi, infinito, subíndice, exponente, al cuadrado, a la n.";

export const DEFAULT_TRANSCRIPTION_CONTEXT_EN =
	"English math dictation: integral, derivative, summation, square root, fraction, limit, alpha, beta, pi, infinity, subscript, exponent, squared, to the n.";

const PROMPTS: Record<
	Exclude<DictationLanguage, "auto">,
	{ conversion: string; context: string }
> = {
	es: {
		conversion: DEFAULT_CONVERSION_PROMPT_ES,
		context: DEFAULT_TRANSCRIPTION_CONTEXT_ES,
	},
	en: {
		conversion: DEFAULT_CONVERSION_PROMPT_EN,
		context: DEFAULT_TRANSCRIPTION_CONTEXT_EN,
	},
};

/** Default prompts for a language. "auto" falls back to Spanish. */
export function defaultPromptsFor(lang: DictationLanguage) {
	return PROMPTS[lang === "auto" ? "es" : lang];
}

/** True if the stored prompt/context is still an untouched default. */
export function isDefaultPrompt(s: LatexVoiceSettings): boolean {
	return (
		(s.conversionPrompt === DEFAULT_CONVERSION_PROMPT_ES ||
			s.conversionPrompt === DEFAULT_CONVERSION_PROMPT_EN) &&
		(s.transcriptionContext === DEFAULT_TRANSCRIPTION_CONTEXT_ES ||
			s.transcriptionContext === DEFAULT_TRANSCRIPTION_CONTEXT_EN)
	);
}

export interface LatexVoiceSettings {
	providerId: string;
	openaiApiKey: string;
	openaiBaseUrl: string;
	transcriptionModel: string;
	conversionModel: string;
	language: DictationLanguage;
	transcriptionContext: string;
	conversionPrompt: string;
	saveAudio: boolean;
	audioFolder: string;
	usage: {
		audioSeconds: number;
		inputTokens: number;
		outputTokens: number;
		requests: number;
	};
	/** E2E only. Requires devMode=true AND testAudioPath set — otherwise ignored. */
	devMode?: boolean;
	testAudioPath?: string;
}

export const DEFAULT_SETTINGS: LatexVoiceSettings = {
	providerId: "openai",
	openaiApiKey: "",
	openaiBaseUrl: "https://api.openai.com/v1",
	transcriptionModel: "gpt-transcribe",
	conversionModel: "gpt-6-luna",
	language: "es",
	transcriptionContext: DEFAULT_TRANSCRIPTION_CONTEXT_ES,
	conversionPrompt: DEFAULT_CONVERSION_PROMPT_ES,
	saveAudio: false,
	audioFolder: "recordings",
	usage: { audioSeconds: 0, inputTokens: 0, outputTokens: 0, requests: 0 },
};
