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
		language: settings.language,
		contextPrompt: settings.transcriptionContext,
	});
	const c = await provider.convertToLatex(t.text, {
		systemPrompt: settings.conversionPrompt,
	});
	return {
		transcript: t.text,
		output: c.text,
		usage: {
			audioSeconds: t.durationSeconds ?? audioSeconds,
			inputTokens: c.inputTokens,
			outputTokens: c.outputTokens,
		},
	};
}
