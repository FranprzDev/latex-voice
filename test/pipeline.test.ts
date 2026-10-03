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
		return { text: `transcribed ${filename}`, durationSeconds: 2.5 };
	},
	async convertToLatex(transcript, opts) {
		expect(opts.systemPrompt).toBe(DEFAULT_SETTINGS.conversionPrompt);
		return { text: `converted: ${transcript}`, inputTokens: 10, outputTokens: 5 };
	},
};

describe("dictatePipeline", () => {
	it("chains transcribe → convertToLatex and returns both", async () => {
		const { transcript, output, usage } = await dictatePipeline(
			fakeProvider,
			new Blob(["a"]),
			"d.m4a",
			DEFAULT_SETTINGS,
		);
		expect(transcript).toBe("transcribed d.m4a");
		expect(output).toBe("converted: transcribed d.m4a");
		expect(usage).toEqual({ audioSeconds: 2.5, inputTokens: 10, outputTokens: 5 });
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

	it("rejects an empty conversion instead of inserting an empty correction", async () => {
		const emptyProvider: VoiceProvider = {
			...fakeProvider,
			convertToLatex: async () => ({ text: "  " }),
		};
		await expect(
			dictatePipeline(emptyProvider, new Blob(["a"]), "d.m4a", DEFAULT_SETTINGS),
		).rejects.toThrow("empty conversion");
	});
});
