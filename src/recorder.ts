export class AudioRecorder {
	private recorder: MediaRecorder | null = null;
	private stream: MediaStream | null = null;
	private chunks: Blob[] = [];

	get isRecording(): boolean {
		return this.recorder?.state === "recording";
	}

	get mimeType(): string {
		return this.recorder?.mimeType ?? "audio/webm";
	}

	async start(): Promise<void> {
		if (this.isRecording) return;
		try {
			this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mimeType = MediaRecorder.isTypeSupported("audio/webm")
				? "audio/webm"
				: undefined;
			this.recorder = new MediaRecorder(this.stream, { mimeType });
			this.chunks = [];
			this.recorder.ondataavailable = (e) => {
				if (e.data.size > 0) this.chunks.push(e.data);
			};
			this.recorder.start();
		} catch (e) {
			this.release();
			throw e;
		}
	}

	stop(): Promise<Blob> {
		return new Promise((resolve, reject) => {
			const recorder = this.recorder;
			if (!recorder || recorder.state !== "recording") {
				this.release();
				return reject(new Error("Not recording"));
			}
			recorder.onstop = () => {
				const blob = new Blob(this.chunks, { type: this.mimeType });
				this.release();
				resolve(blob);
			};
			recorder.onerror = (e) => {
				this.release();
				reject(e);
			};
			recorder.stop();
		});
	}

	/** Synchronous cleanup for plugin unload — never throws. */
	dispose(): void {
		try {
			if (this.recorder && this.recorder.state !== "inactive") {
				this.recorder.onstop = null;
				this.recorder.onerror = null;
				this.recorder.ondataavailable = null;
				this.recorder.stop();
			}
		} catch { /* ignore */ }
		this.release();
	}

	private release(): void {
		this.stream?.getTracks().forEach((t) => t.stop());
		this.stream = null;
		this.recorder = null;
		this.chunks = [];
	}
}
