import { describe, it, expect, vi, afterEach } from "vitest";
import { OpenAIProvider } from "../src/providers/openai";

const provider = new OpenAIProvider({
	apiKey: "sk-test",
	baseUrl: "https://api.openai.com/v1",
	transcriptionModel: "gpt-transcribe",
	conversionModel: "gpt-4o-mini",
});

function mockFetchOnce(body: unknown, ok = true, status = 200) {
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => ({
			ok,
			status,
			json: async () => body,
		})),
	);
}

afterEach(() => vi.unstubAllGlobals());

describe("OpenAIProvider.transcribe", () => {
	it("posts multipart form to /audio/transcriptions and returns text", async () => {
		mockFetchOnce({ text: "integral de a a b" });
		const blob = new Blob(["fake-audio"], { type: "audio/mp4" });
		const out = await provider.transcribe(blob, "d.m4a", {
			language: "es",
			contextPrompt: "math",
		});
		expect(out).toBe("integral de a a b");
		const [url, init] = vi.mocked(fetch).mock.calls[0];
		expect(url).toBe("https://api.openai.com/v1/audio/transcriptions");
		expect(init.method).toBe("POST");
		const form = init.body as FormData;
		expect(form.get("model")).toBe("gpt-transcribe");
		expect(form.get("language")).toBe("es");
		expect(form.get("prompt")).toBe("math");
	});

	it("omits language when set to auto", async () => {
		mockFetchOnce({ text: "hi" });
		await provider.transcribe(new Blob(["x"]), "d.m4a", { language: "auto" });
		const form = vi.mocked(fetch).mock.calls[0][1].body as FormData;
		expect(form.get("language")).toBeNull();
	});

	it("throws on API error", async () => {
		mockFetchOnce({ error: { message: "bad key" } }, false, 401);
		await expect(
			provider.transcribe(new Blob(["x"]), "d.m4a", {}),
		).rejects.toThrow("bad key");
	});
});

describe("OpenAIProvider.convertToLatex", () => {
	it("sends system prompt + transcript and returns trimmed content", async () => {
		mockFetchOnce({
			choices: [{ message: { content: "  $\\int_a^b f(x)$  " } }],
		});
		const out = await provider.convertToLatex("integral de a a b", {
			systemPrompt: "convert",
		});
		expect(out).toBe("$\\int_a^b f(x)$");
		const init = vi.mocked(fetch).mock.calls[0][1];
		const body = JSON.parse(init.body as string);
		expect(body.model).toBe("gpt-4o-mini");
		expect(body.messages[0]).toEqual({ role: "system", content: "convert" });
		expect(body.messages[1].role).toBe("user");
	});

	it("throws when response has no content", async () => {
		mockFetchOnce({ choices: [] });
		await expect(
			provider.convertToLatex("x", { systemPrompt: "p" }),
		).rejects.toThrow();
	});
});
