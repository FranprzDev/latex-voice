import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, statSync } from "fs";
import { join } from "path";

/**
 * Fixture integrity checks — run in CI without API keys: every dictation
 * entry must point to a real, non-empty audio file and have valid regexes.
 */

const FIXTURES = join(__dirname, "fixtures");
const dictations: {
	file: string;
	subject: string;
	language: string;
	dictated: string;
	mustMatch: string[];
}[] = JSON.parse(readFileSync(join(FIXTURES, "dictations.json"), "utf8"));

describe("fixtures", () => {
	it("has dictations", () => {
		expect(dictations.length).toBeGreaterThanOrEqual(50);
	});

	it("covers the four course subjects", () => {
		const subjects = new Set(dictations.map((d) => d.subject));
		for (const s of [
			"Análisis Matemático 1",
			"Análisis Matemático 2",
			"Física 1",
			"Física 2",
		]) {
			expect(subjects.has(s), `missing subject ${s}`).toBe(true);
		}
	});

	for (const d of dictations) {
		it(`${d.file}: audio exists, is non-trivial, regexes compile`, () => {
			const path = join(FIXTURES, d.file);
			expect(existsSync(path), `${d.file} missing`).toBe(true);
			expect(statSync(path).size).toBeGreaterThan(5000);
			expect(d.mustMatch.length).toBeGreaterThan(0);
			for (const p of d.mustMatch) {
				expect(() => new RegExp(p), `bad regex ${p}`).not.toThrow();
			}
			expect(d.language).toBe("es");
		});
	}
});
