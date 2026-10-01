import { VoiceProvider } from "./providers";
import { LatexVoiceSettings } from "./settings";

/**
 * Core dictation pipeline, decoupled from Obsidian so it can be tested
 * directly: audio in, Markdown+LaTeX out.
 */
export async function dictatePipeline(
	provider: VoiceProvider,
	audio: Blob,
	filename: string,
	settings: LatexVoiceSettings,
): Promise<{ transcript: string; output: string }> {
	const transcript = await provider.transcribe(audio, filename, {
		language: settings.language,
		contextPrompt: settings.transcriptionContext,
	});
	const output = await provider.convertToLatex(transcript, {
		systemPrompt: settings.conversionPrompt,
	});
	return { transcript, output };
}
