/**
 * Combines several abort signals into one. Uses the native
 * `AbortSignal.any` when available and otherwise falls back to a manual
 * implementation, because Obsidian 1.5 runs on Chromium 114, which lacks
 * it (shipped in Chromium 116).
 */
export function anySignal(signals: Array<AbortSignal | undefined>): AbortSignal {
	const list = signals.filter((s): s is AbortSignal => !!s);
	const native = (AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }).any;
	if (typeof native === "function") return native(list);

	const controller = new AbortController();
	const abortIfNeeded = () => {
		const aborted = list.find((s) => s.aborted);
		if (aborted) controller.abort(aborted.reason);
	};
	const onAbort = () => {
		abortIfNeeded();
		for (const s of list) s.removeEventListener("abort", onAbort);
	};
	if (list.some((s) => s.aborted)) {
		abortIfNeeded();
		return controller.signal;
	}
	for (const s of list) s.addEventListener("abort", onAbort, { once: true });
	return controller.signal;
}
