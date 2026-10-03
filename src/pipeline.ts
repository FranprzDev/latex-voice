import { VoiceProvider } from "./providers";
import { LatexVoiceSettings } from "./settings";

/**
 * Core dictation pipeline, decoupled from Obsidian so it can be tested
 * directly: audio in, Markdown+LaTeX out.
 */
export interface PipelineResult {
	transcript: string;
	output: string;
	usage: {
		audioSeconds?: number;
		inputTokens?: number;
		outputTokens?: number;
	};
}

export async function dictatePipeline(
	provider: VoiceProvider,
	audio: Blob,
	filename: string,
	settings: LatexVoiceSettings,
	audioSeconds?: number,
): Promise<PipelineResult> {
	const t = await provider.transcribe(audio, filename, {
		language: "es",
		contextPrompt: settings.transcriptionContext,
	});
	if (!t.text.trim()) {
		throw new Error("empty transcript");
	}
	const c = await provider.convertToLatex(t.text, {
		systemPrompt: settings.conversionPrompt,
	});
	// "//" is the spoken paragraph-break marker.
	const output = c.text.replace(/\s*\/\/\s*/g, "\n\n").trim();
	if (!output) throw new Error("empty conversion");
	return {
		transcript: t.text,
		output,
		usage: {
			audioSeconds: t.durationSeconds ?? audioSeconds,
			inputTokens: c.inputTokens,
			outputTokens: c.outputTokens,
		},
	};
}
