import { describe, it, expect } from "vitest";
import {
	DEFAULT_CONVERSION_PROMPT_ES,
	DEFAULT_SETTINGS,
	DEFAULT_TRANSCRIPTION_CONTEXT_ES,
	migrateSettings,
} from "../src/settings";

describe("Spanish math dictation defaults", () => {
	it("preserves narrated steps without switching languages", () => {
		expect(DEFAULT_SETTINGS.conversionPrompt).toContain("No resumas ni saltes pasos");
		expect(DEFAULT_SETTINGS.conversionPrompt).toContain("No resuelvas");
		expect(DEFAULT_SETTINGS.transcriptionContext).toContain("fracciones parciales");
		expect(DEFAULT_SETTINGS).not.toHaveProperty("language");
	});
});

describe("migrateSettings", () => {
	it("drops the removed language setting", () => {
		const s = migrateSettings({ language: "en", openaiApiKey: "sk-test" });
		expect(s).not.toHaveProperty("language");
		expect(s.openaiApiKey).toBe("sk-test");
	});

	it("upgrades untouched legacy default prompts to Spanish", () => {
		const s = migrateSettings({
			conversionPrompt: "You convert English dictated text into Obsidian Markdown with LaTeX math.",
			transcriptionContext: "English math dictation: integral, derivative.",
		});
		expect(s.conversionPrompt).toBe(DEFAULT_CONVERSION_PROMPT_ES);
		expect(s.transcriptionContext).toBe(DEFAULT_TRANSCRIPTION_CONTEXT_ES);
	});

	it("respects custom prompts and context", () => {
		const s = migrateSettings({
			conversionPrompt: "mis reglas",
			transcriptionContext: "mi vocabulario",
		});
		expect(s.conversionPrompt).toBe("mis reglas");
		expect(s.transcriptionContext).toBe("mi vocabulario");
	});

	it("keeps a valid correction target and discards a malformed one", () => {
		const target = { filePath: "n.md", from: 1, to: 4, text: "abc" };
		expect(migrateSettings({ lastDictation: target }).lastDictation).toEqual(target);
		expect(migrateSettings({ lastDictation: { from: 1 } }).lastDictation).toBeNull();
	});

	it("merges partial usage counters over the defaults", () => {
		const s = migrateSettings({ usage: { requests: 3 } as never });
		expect(s.usage.requests).toBe(3);
		expect(s.usage.audioSeconds).toBe(0);
	});
});
