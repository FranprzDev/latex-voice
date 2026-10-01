import {
	App,
	MarkdownView,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";
import { AudioRecorder } from "./recorder";
import { createProvider } from "./providers";
import { dictatePipeline } from "./pipeline";
import { friendlyError } from "./errors";
import {
	DEFAULT_SETTINGS,
	DictationLanguage,
	LatexVoiceSettings,
	defaultPromptsFor,
	isDefaultPrompt,
} from "./settings";

export default class LatexVoicePlugin extends Plugin {
	declare settings: LatexVoiceSettings;
	private recorder = new AudioRecorder();
	private statusBarEl!: HTMLElement;

	async onload() {
		await this.loadSettings();
		this.statusBarEl = this.addStatusBarItem();
		this.updateStatus("");

		this.addRibbonIcon("mic", "LaTeX Voice: toggle dictation", () => {
			void this.toggleDictation();
		});

		this.addCommand({
			id: "toggle-dictation",
			name: "Start/stop voice dictation",
			hotkeys: [{ modifiers: ["Mod", "Shift"], key: "M" }],
			callback: () => void this.toggleDictation(),
		});

		this.addSettingTab(new LatexVoiceSettingTab(this.app, this));

		if (!this.settings.openaiApiKey && !this.settings.devMode) {
			new Notice(
				"LaTeX Voice: pegá tu OpenAI API key en Settings → LaTeX Voice para empezar.",
				8000,
			);
		}
	}

	onunload() {
		this.recorder.dispose();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private updateStatus(text: string) {
		this.statusBarEl.setText(text ? `LaTeX Voice: ${text}` : "");
	}

	private async toggleDictation() {
		if (this.settings.devMode && this.settings.testAudioPath) {
			await this.dictateFromFile(this.settings.testAudioPath);
			return;
		}
		if (this.recorder.isRecording) {
			await this.stopAndProcess();
			return;
		}
		if (!this.settings.openaiApiKey) {
			new Notice("LaTeX Voice: falta la API key (Settings → LaTeX Voice).");
			return;
		}
		try {
			await this.recorder.start();
			this.updateStatus("grabando…");
		} catch (e) {
			new Notice(`LaTeX Voice: ${friendlyError(e)}`);
		}
	}

	private async stopAndProcess() {
		let audio: Blob;
		try {
			audio = await this.recorder.stop();
		} catch {
			this.updateStatus("");
			return;
		}

		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) {
			new Notice("LaTeX Voice: abrí una nota antes de dictar.");
			this.updateStatus("");
			return;
		}

		try {
			const provider = createProvider(this.settings);
			const ext = audio.type.includes("webm") ? "webm" : "m4a";
			console.log(`[latex-voice] audio blob: ${audio.size} bytes, type=${audio.type}`);
			if (audio.size < 1000) {
				throw new Error("empty transcript");
			}

			this.updateStatus("transcribing…");
			const { output, usage } = await dictatePipeline(
				provider,
				audio,
				`dictation.${ext}`,
				this.settings,
				this.recorder.lastDurationSeconds,
			);
			await this.recordUsage(usage);

			view.editor.replaceSelection(output);
			if (this.settings.saveAudio) {
				await this.saveAudioFile(audio, ext);
			}
			new Notice("LaTeX Voice: listo.");
		} catch (e) {
			new Notice(`LaTeX Voice: ${friendlyError(e)}`);
		} finally {
			this.updateStatus("");
		}
	}

	private async dictateFromFile(path: string) {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) {
			new Notice("LaTeX Voice: abrí una nota antes de dictar.");
			return;
		}
		try {
			this.updateStatus("transcribing…");
			const buffer = await this.app.vault.adapter.readBinary(path);
			const audio = new Blob([buffer]);
			const provider = createProvider(this.settings);
			const { output, usage } = await dictatePipeline(provider, audio, path, this.settings);
			await this.recordUsage(usage);
			view.editor.replaceSelection(output);
			new Notice("LaTeX Voice: listo (audio de prueba).");
		} catch (e) {
			new Notice(`LaTeX Voice: ${friendlyError(e)}`);
		} finally {
			this.updateStatus("");
		}
	}

	async recordUsage(u: { audioSeconds?: number; inputTokens?: number; outputTokens?: number }) {
		const usage = this.settings.usage;
		usage.audioSeconds += u.audioSeconds ?? 0;
		usage.inputTokens += u.inputTokens ?? 0;
		usage.outputTokens += u.outputTokens ?? 0;
		usage.requests += 1;
		await this.saveSettings();
	}

	private async saveAudioFile(audio: Blob, ext: string) {
		const folder = this.settings.audioFolder;
		if (!(await this.app.vault.adapter.exists(folder))) {
			await this.app.vault.createFolder(folder);
		}
		const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
		const name = `${folder}/${stamp}.${ext}`;
		await this.app.vault.createBinary(name, await audio.arrayBuffer());
	}
}

class LatexVoiceSettingTab extends PluginSettingTab {
	constructor(app: App, private plugin: LatexVoicePlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		const s = this.plugin.settings;

		containerEl.createEl("p", {
			text: "BYOK: bring your own OpenAI API key — that's the only requirement.",
		});

		const apiKeySetting = new Setting(containerEl)
			.setName("OpenAI API key")
			.setDesc("Required. Get one at platform.openai.com → API keys.")
			.addText((t) =>
				t.setPlaceholder("sk-...")
					.setValue(s.openaiApiKey)
					.onChange(async (v) => {
						s.openaiApiKey = v.trim();
						await this.plugin.saveSettings();
					})
			);
		apiKeySetting.controlEl.querySelector("input")?.setAttribute("type", "password");

		new Setting(containerEl)
			.setName("Base URL")
			.setDesc("OpenAI-compatible endpoint.")
			.addText((t) =>
				t.setValue(s.openaiBaseUrl).onChange(async (v) => {
					s.openaiBaseUrl = v.trim();
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Transcription model")
			.addText((t) =>
				t.setValue(s.transcriptionModel).onChange(async (v) => {
					s.transcriptionModel = v.trim();
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Conversion model")
			.addText((t) =>
				t.setValue(s.conversionModel).onChange(async (v) => {
					s.conversionModel = v.trim();
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Dictation language")
			.setDesc("Language you dictate math in. Switching updates default prompts unless customized.")
			.addDropdown((d) =>
				d.addOption("es", "Español")
					.addOption("en", "English")
					.addOption("auto", "Auto-detect")
					.setValue(s.language)
					.onChange(async (v) => {
						s.language = v as DictationLanguage;
						if (isDefaultPrompt(s)) {
							const p = defaultPromptsFor(s.language);
							s.conversionPrompt = p.conversion;
							s.transcriptionContext = p.context;
						}
						await this.plugin.saveSettings();
						this.display();
					})
			);

		new Setting(containerEl)
			.setName("Transcription context")
			.setDesc("Vocabulary hints sent to the transcription model.")
			.addTextArea((t) => {
				t.setValue(s.transcriptionContext).onChange(async (v) => {
					s.transcriptionContext = v;
					await this.plugin.saveSettings();
				});
				t.inputEl.rows = 3;
				t.inputEl.cols = 40;
			});

		new Setting(containerEl)
			.setName("Conversion prompt")
			.setDesc("System prompt for transcript → Markdown/LaTeX.")
			.addTextArea((t) => {
				t.setValue(s.conversionPrompt).onChange(async (v) => {
					s.conversionPrompt = v;
					await this.plugin.saveSettings();
				});
				t.inputEl.rows = 10;
				t.inputEl.cols = 40;
			});

		new Setting(containerEl)
			.setName("Save audio")
			.setDesc("Keep recordings in the vault.")
			.addToggle((t) =>
				t.setValue(s.saveAudio).onChange(async (v) => {
					s.saveAudio = v;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Audio folder")
			.addText((t) =>
				t.setValue(s.audioFolder).onChange(async (v) => {
					s.audioFolder = v.trim();
					await this.plugin.saveSettings();
				})
			);

		const u = s.usage;
		new Setting(containerEl)
			.setName("Usage")
			.setDesc(
				`${u.requests} dictations · ${Math.round(u.audioSeconds)}s audio · ` +
					`${u.inputTokens + u.outputTokens} tokens`,
			)
			.addButton((b) =>
				b.setButtonText("Reset").onClick(async () => {
					s.usage = { audioSeconds: 0, inputTokens: 0, outputTokens: 0, requests: 0 };
					await this.plugin.saveSettings();
					this.display();
				})
			);
	}
}
