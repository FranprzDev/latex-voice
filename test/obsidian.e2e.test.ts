import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, Browser, Page } from "playwright";
import { spawn, execSync, ChildProcess } from "child_process";
import { writeFileSync, mkdirSync, cpSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";

/**
 * E2E driving real Obsidian (Electron) via Chrome DevTools Protocol.
 *
 * Playwright's electron.launch doesn't work with Obsidian (it never emits
 * the DevTools port line Playwright waits for), so we launch Obsidian
 * ourselves with a fixed --remote-debugging-port and attach via
 * chromium.connectOverCDP.
 *
 * The dev vault is registered in Obsidian's global obsidian.json so it
 * opens at launch (restored to closed on cleanup).
 * `testAudioPath` in the plugin's data.json makes dictation read a
 * synthesized audio fixture instead of the microphone.
 *
 * Requires `npm run build` first. Full pipeline assertion needs
 * OPENAI_API_KEY; without it we verify load + command + graceful failure.
 *
 * Run: npm run test:obsidian
 */

const ROOT = resolve(__dirname, "..");
const VAULT = resolve(ROOT, "dev-vault");
const PLUGIN_DIR = resolve(VAULT, ".obsidian/plugins/vibe-latex");
const OBSIDIAN_BIN = "/Applications/Obsidian.app/Contents/MacOS/Obsidian";
const API_KEY = process.env.OPENAI_API_KEY;
const CDP_PORT = 9222;
const VAULT_ID = "latexvoicedev01";
const OBSIDIAN_CFG = `${homedir()}/Library/Application Support/obsidian/obsidian.json`;

let obs: ChildProcess;
let browser: Browser;
let page: Page;
let results: Record<string, unknown>;

async function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

describe("obsidian e2e", () => {
	beforeAll(async () => {
		mkdirSync(PLUGIN_DIR, { recursive: true });
		cpSync(resolve(ROOT, "main.js"), resolve(PLUGIN_DIR, "main.js"));
		cpSync(resolve(ROOT, "manifest.json"), resolve(PLUGIN_DIR, "manifest.json"));
		writeFileSync(
			resolve(VAULT, ".obsidian/community-plugins.json"),
			'["vibe-latex"]',
		);
		if (!existsSync(resolve(VAULT, "note.md")))
			writeFileSync(resolve(VAULT, "note.md"), "# Test Note\n\nDictated: \n");
		if (!existsSync(resolve(VAULT, "integral.m4a")))
			cpSync(
				resolve(ROOT, "test/fixtures/integral.m4a"),
				resolve(VAULT, "integral.m4a"),
			);

		// merge into existing data.json (keep user's API key etc.), mark devMode
		const dataPath = resolve(PLUGIN_DIR, "data.json");
		const existing = existsSync(dataPath)
			? JSON.parse(readFileSync(dataPath, "utf8"))
			: {};
		writeFileSync(
			dataPath,
			JSON.stringify(
				{
					...existing,
					devMode: true,
					testAudioPath: "integral.m4a",
					...(API_KEY ? { openaiApiKey: API_KEY } : {}),
				},
				null,
				2,
			),
		);

		// Obsidian must not already be running (single-instance forwarding
		// would ignore our launch args). Kill leftover debug instances and
		// fail fast if the user's own Obsidian is open.
		try {
			execSync("pkill -f 'remote-debugging-port=9222' || true");
			await sleep(2000);
		} catch { /* none running */ }
		const running = execSync("pgrep -x Obsidian || true").toString();
		if (running.trim()) {
			throw new Error(
				"Obsidian is running — close it first (the e2e needs its own debug instance).",
			);
		}

		// register dev-vault so Obsidian opens it at launch
		const cfg = JSON.parse(readFileSync(OBSIDIAN_CFG, "utf8"));
		cfg.vaults[VAULT_ID] = { path: VAULT, ts: Date.now(), open: true };
		writeFileSync(OBSIDIAN_CFG, JSON.stringify(cfg));

		obs = spawn(OBSIDIAN_BIN, [`--remote-debugging-port=${CDP_PORT}`], {
			stdio: "ignore",
		});

		for (let i = 0; i < 30 && !browser; i++) {
			try {
				browser = await chromium.connectOverCDP(
					`http://localhost:${CDP_PORT}`,
				);
			} catch {
				await sleep(1000);
			}
		}
		if (!browser) throw new Error("Obsidian CDP never came up");
		await sleep(3000);

		// find the page whose vault is dev-vault
		for (let i = 0; i < 20; i++) {
			for (const p of browser.contexts().flatMap((c) => c.pages())) {
				const name = await p
					.evaluate(() => (window as any).app?.vault?.getName?.())
					.catch(() => undefined);
				if (name === "dev-vault") {
					page = p;
					break;
				}
			}
			if (page) break;
			await sleep(1000);
		}
		if (!page) throw new Error("dev-vault page not found in Obsidian");
		await page.reload(); // ensure plugin picked up fresh files
		await sleep(5000);

		results = await page.evaluate(async () => {
			const obs = (window as any).app;
			const out: Record<string, unknown> = {};
			out.hasApp = !!obs;
			out.pluginLoaded = !!obs?.plugins?.plugins?.["vibe-latex"];
			out.commandRegistered =
				!!obs?.commands?.commands?.["vibe-latex:toggle-dictation"];
			out.correctionCommandRegistered =
				!!obs?.commands?.commands?.["vibe-latex:correct-last-dictation"];
			out.communityEnabled =
				obs?.plugins?.enabledPlugins?.has?.("vibe-latex") ?? false;

			const file = obs.vault.getAbstractFileByPath("note.md");
			if (file) {
				await obs.workspace.getLeaf(false).openFile(file);
				await new Promise((r) => setTimeout(r, 500));
			}
			out.noteOpened = obs.workspace.getActiveFile()?.path === "note.md";

			if (out.commandRegistered) {
				obs.commands.executeCommandById("vibe-latex:toggle-dictation");
				await new Promise((r) => setTimeout(r, 30_000));
				out.fileContent = file ? await obs.vault.read(file) : "";
			}
			return out;
		});
	}, 120_000);

	afterAll(async () => {
		await browser?.close().catch(() => undefined);
		obs?.kill();
		// restore data.json to production state — devMode/testAudioPath are
		// test-only and must never leak into manual use of this vault
		try {
			const dataPath = resolve(PLUGIN_DIR, "data.json");
			const d = JSON.parse(readFileSync(dataPath, "utf8"));
			delete d.devMode;
			delete d.testAudioPath;
			writeFileSync(dataPath, JSON.stringify(d, null, 2));
		} catch { /* best effort */ }
		try {
			const cfg = JSON.parse(readFileSync(OBSIDIAN_CFG, "utf8"));
			if (cfg.vaults?.[VAULT_ID]) cfg.vaults[VAULT_ID].open = false;
			writeFileSync(OBSIDIAN_CFG, JSON.stringify(cfg));
		} catch { /* best effort */ }
	});

	it("app is available", () => expect(results.hasApp).toBe(true));
	it("plugin loaded", () => expect(results.pluginLoaded).toBe(true));
	it("community plugin enabled", () =>
		expect(results.communityEnabled).toBe(true));
	it("command registered", () => expect(results.commandRegistered).toBe(true));
	it("correction command registered", () =>
		expect(results.correctionCommandRegistered).toBe(true),
	);
	it("note opened", () => expect(results.noteOpened).toBe(true));

	it(API_KEY ? "inserts LaTeX into the note" : "fails gracefully without key", () => {
		const content = String(results.fileContent ?? "");
		if (API_KEY) {
			expect(content).toMatch(/\\int_\{?a\}?\^\{?b\}?/);
		} else {
			expect(content).toBe("# Test Note\n\nDictated: \n");
		}
	});
});
