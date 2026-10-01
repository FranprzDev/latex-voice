export interface TranscribeOptions {
	language?: string;
	contextPrompt?: string;
	signal?: AbortSignal;
}

export interface ConvertOptions {
	systemPrompt: string;
	signal?: AbortSignal;
}

/**
 * A voice provider bundles the two AI capabilities this plugin needs:
 * speech-to-text and text-to-LaTeX conversion. Adding support for a new
 * backend (Groq, Ollama, Deepgram+LLM, ...) is a matter of implementing
 * this interface and registering it in providers/index.ts.
 */
export interface VoiceProvider {
	readonly id: string;
	readonly displayName: string;

	transcribe(audio: Blob, filename: string, opts: TranscribeOptions): Promise<string>;
	convertToLatex(transcript: string, opts: ConvertOptions): Promise<string>;
}
