import { describe, expect, it } from "vitest";
import {
	dictationReplacementText,
	verifiedDictationRange,
} from "../src/dictation-range";
import { migrateSettings } from "../src/settings";

describe("verifiedDictationRange", () => {
	it("returns the saved range only while its dictated text is unchanged", () => {
		const range = { filePath: "nota.md", from: 3, to: 8, text: "abcde" };
		expect(verifiedDictationRange("hi abcde!", range)).toEqual({ from: 3, to: 8 });
		expect(verifiedDictationRange("hi abXde!", range)).toBeNull();
	});

	it("keeps working after a reload while the note is untouched", () => {
		const stored = {
			lastDictation: { filePath: "nota.md", from: 0, to: 5, text: "hola\n" },
		};
		const range = migrateSettings(stored).lastDictation;
		expect(range).not.toBeNull();
		expect(verifiedDictationRange("hola\nresto", range!)).toEqual({ from: 0, to: 5 });
		expect(verifiedDictationRange("hola! resto", range!)).toBeNull();
	});
});

describe("dictationReplacementText", () => {
	it("keeps line breaks for insertions and preserves the selected text shape", () => {
		expect(dictationReplacementText("nuevo", "")).toBe("nuevo\n");
		expect(dictationReplacementText("nuevo", "viejo")).toBe("nuevo");
		expect(dictationReplacementText("nuevo", "viejo\n")).toBe("nuevo\n");
		expect(dictationReplacementText("nuevo", "", "anterior\n")).toBe("nuevo\n");
	});
});
