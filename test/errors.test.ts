import { describe, it, expect } from "vitest";
import { friendlyError } from "../src/errors";

describe("friendlyError", () => {
	it("maps 401 to API key message", () => {
		expect(friendlyError(new Error("Invalid API key (HTTP 401)"))).toContain(
			"API key",
		);
	});
	it("maps 429 to rate limit", () => {
		expect(friendlyError(new Error("rate limit (HTTP 429)"))).toContain(
			"Límite",
		);
	});
	it("maps network failures", () => {
		expect(friendlyError(new Error("fetch failed: ENOTFOUND"))).toContain(
			"conexión",
		);
	});
	it("maps mic permission errors", () => {
		expect(
			friendlyError(new Error("NotAllowedError: permission denied")),
		).toContain("micrófono");
	});
	it("truncates unknown errors to a short first line", () => {
		const long = "x".repeat(500) + "\nsecond line";
		const out = friendlyError(new Error(long));
		expect(out.length).toBeLessThanOrEqual(120);
		expect(out).not.toContain("second line");
	});
	it("handles non-Error values", () => {
		expect(friendlyError("plain string 401")).toContain("API key");
	});
});
