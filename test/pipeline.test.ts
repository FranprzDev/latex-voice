import { describe, it, expect } from "vitest";
import { dictatePipeline } from "../src/pipeline";
import { VoiceProvider } from "../src/providers";
import { DEFAULT_SETTINGS } from "../src/settings";

const fakeProvider: VoiceProvider = {
	id: "fake",
	displayName: "Fake",
	async transcribe(_audio, filename, opts) {
		expect(opts.language).toBe("es");
		expect(opts.contextPrompt).toContain("integral");
		return `transcribed ${filename}`;
	},
	async convertToLatex(transcript, opts) {
		expect(opts.systemPrompt).toBe(DEFAULT_SETTINGS.conversionPrompt);
		return `converted: ${transcript}`;
	},
};

describe("dictatePipeline", () => {
	it("chains transcribe → convertToLatex and returns both", async () => {
		const { transcript, output } = await dictatePipeline(
			fakeProvider,
			new Blob(["a"]),
			"d.m4a",
			DEFAULT_SETTINGS,
		);
		expect(transcript).toBe("transcribed d.m4a");
		expect(output).toBe("converted: transcribed d.m4a");
	});

	it("propagates transcription errors", async () => {
		const failing: VoiceProvider = {
			...fakeProvider,
			transcribe: async () => {
				throw new Error("mic dead");
			},
		};
		await expect(
			dictatePipeline(failing, new Blob(["a"]), "d.m4a", DEFAULT_SETTINGS),
		).rejects.toThrow("mic dead");
	});
});
