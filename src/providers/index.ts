import { VoiceProvider } from "./provider";
import { OpenAIProvider } from "./openai";
import { LatexVoiceSettings } from "../settings";

export function createProvider(settings: LatexVoiceSettings): VoiceProvider {
	switch (settings.providerId) {
		case "openai":
		default:
			return new OpenAIProvider({
				apiKey: settings.openaiApiKey,
				baseUrl: settings.openaiBaseUrl,
				transcriptionModel: settings.transcriptionModel,
				conversionModel: settings.conversionModel,
			});
	}
}

export type { VoiceProvider, TranscribeOptions, ConvertOptions } from "./provider";
