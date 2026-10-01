import { describe, it, expect } from "vitest";
import {
	DEFAULT_SETTINGS,
	DEFAULT_CONVERSION_PROMPT_EN,
	DEFAULT_TRANSCRIPTION_CONTEXT_EN,
	defaultPromptsFor,
	isDefaultPrompt,
} from "../src/settings";

describe("language prompt selection", () => {
	it("es defaults to Spanish prompts", () => {
		const p = defaultPromptsFor("es");
		expect(p.conversion).toContain("Spanish");
		expect(p.context).toContain("integral");
	});

	it("en defaults to English prompts", () => {
		const p = defaultPromptsFor("en");
		expect(p.conversion).toBe(DEFAULT_CONVERSION_PROMPT_EN);
		expect(p.context).toBe(DEFAULT_TRANSCRIPTION_CONTEXT_EN);
	});

	it("auto falls back to Spanish prompts", () => {
		expect(defaultPromptsFor("auto")).toEqual(defaultPromptsFor("es"));
	});

	it("isDefaultPrompt detects untouched defaults", () => {
		expect(isDefaultPrompt({ ...DEFAULT_SETTINGS })).toBe(true);
		expect(
			isDefaultPrompt({
				...DEFAULT_SETTINGS,
				conversionPrompt: "custom",
			}),
		).toBe(false);
	});
});
