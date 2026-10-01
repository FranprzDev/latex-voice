import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { dictatePipeline } from "../src/pipeline";
import { OpenAIProvider } from "../src/providers/openai";
import {
	DEFAULT_SETTINGS,
	LatexVoiceSettings,
	defaultPromptsFor,
} from "../src/settings";

/**
 * Real end-to-end test: synthesized Spanish speech (macOS `say`) →
 * OpenAI transcription → LLM LaTeX conversion → regex assertions.
 *
 * Requires OPENAI_API_KEY (or OPENAI_API_KEY in .env). Skipped otherwise.
 */

const apiKey = process.env.OPENAI_API_KEY;
const run = apiKey ? describe : describe.skip;

const FIXTURES = join(__dirname, "fixtures");
const dictations: {
	file: string;
	language: "es" | "en";
	dictated: string;
	mustMatch: string[];
}[] = JSON.parse(readFileSync(join(FIXTURES, "dictations.json"), "utf8"));

function settingsFor(lang: "es" | "en"): LatexVoiceSettings {
	const p = defaultPromptsFor(lang);
	return {
		...DEFAULT_SETTINGS,
		openaiApiKey: apiKey ?? "",
		language: lang,
		conversionPrompt: p.conversion,
		transcriptionContext: p.context,
	};
}

const provider = new OpenAIProvider({
	apiKey: apiKey ?? "",
	baseUrl: DEFAULT_SETTINGS.openaiBaseUrl,
	transcriptionModel: DEFAULT_SETTINGS.transcriptionModel,
	conversionModel: DEFAULT_SETTINGS.conversionModel,
});

run("e2e: dictation → LaTeX", { timeout: 120_000 }, () => {
	for (const d of dictations) {
		it(`"${d.dictated}" produces expected LaTeX`, async () => {
			const audio = new Blob([readFileSync(join(FIXTURES, d.file))], {
				type: "audio/mp4",
			});
			const { transcript, output } = await dictatePipeline(
				provider,
				audio,
				d.file,
				settingsFor(d.language),
			);
			console.log(`\n  transcript: ${transcript}\n  output: ${output}`);
			for (const pattern of d.mustMatch) {
				expect(output, `missing ${pattern}`).toMatch(new RegExp(pattern));
			}
		});
	}
});
