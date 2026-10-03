import { describe, it, expect, afterEach } from "vitest";
import { anySignal } from "../src/abort";

/** Runs fn with the native AbortSignal.any removed, exercising the fallback. */
function withoutNativeAny(fn: () => void) {
	const native = (AbortSignal as unknown as { any?: unknown }).any;
	try {
		(AbortSignal as unknown as { any?: unknown }).any = undefined;
		fn();
	} finally {
		(AbortSignal as unknown as { any?: unknown }).any = native;
	}
}

describe("anySignal", () => {
	it("aborts when any source signal aborts", () => {
		const a = new AbortController();
		const b = new AbortController();
		const combined = anySignal([a.signal, b.signal]);
		expect(combined.aborted).toBe(false);
		b.abort();
		expect(combined.aborted).toBe(true);
	});

	it("ignores undefined entries", () => {
		expect(anySignal([undefined]).aborted).toBe(false);
	});

	it("returns an already-aborted signal when a source is aborted", () => {
		const a = new AbortController();
		a.abort();
		expect(anySignal([a.signal]).aborted).toBe(true);
	});

	it("works on the fallback path without AbortSignal.any", () => {
		withoutNativeAny(() => {
			const a = new AbortController();
			const combined = anySignal([a.signal]);
			expect(combined.aborted).toBe(false);
			a.abort();
			expect(combined.aborted).toBe(true);
		});
	});

	it("handles an already-aborted source on the fallback path", () => {
		withoutNativeAny(() => {
			const a = new AbortController();
			a.abort();
			expect(anySignal([a.signal]).aborted).toBe(true);
		});
	});
});
