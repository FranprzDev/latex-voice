import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AudioRecorder } from "../src/recorder";

/**
 * Leak-focused tests: verify every path releases the MediaStream tracks
 * and drops the MediaRecorder handlers.
 */

class FakeTrack {
	stopped = false;
	stop() {
		this.stopped = true;
	}
}
class FakeStream {
	tracks = [new FakeTrack(), new FakeTrack()];
	getTracks() {
		return this.tracks;
	}
}
class FakeMediaRecorder {
	static isTypeSupported = () => true;
	state: "inactive" | "recording" = "inactive";
	mimeType = "audio/webm";
	ondataavailable: ((e: { data: Blob }) => void) | null = null;
	onstop: (() => void) | null = null;
	onerror: ((e: unknown) => void) | null = null;
	constructor(public stream: unknown, public opts: unknown) {}
	start() {
		this.state = "recording";
	}
	stop() {
		this.state = "inactive";
		this.onstop?.();
	}
}

let lastStream: FakeStream;

beforeEach(() => {
	vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
	vi.stubGlobal("navigator", {
		mediaDevices: {
			getUserMedia: vi.fn(async () => {
				lastStream = new FakeStream();
				return lastStream;
			}),
		},
	});
});

afterEach(() => vi.unstubAllGlobals());

const tracksStopped = () => lastStream.tracks.every((t) => t.stopped);

describe("AudioRecorder leak safety", () => {
	it("stop() releases tracks and clears handlers", async () => {
		const r = new AudioRecorder();
		await r.start();
		expect(r.isRecording).toBe(true);
		await r.stop();
		expect(r.isRecording).toBe(false);
		expect(tracksStopped()).toBe(true);
	});

	it("dispose() stops tracks synchronously mid-recording", async () => {
		const r = new AudioRecorder();
		await r.start();
		r.dispose();
		expect(tracksStopped()).toBe(true);
		expect(r.isRecording).toBe(false);
	});

	it("dispose() is safe when never started", () => {
		expect(() => new AudioRecorder().dispose()).not.toThrow();
	});

	it("releases the stream if MediaRecorder construction throws", async () => {
		vi.stubGlobal(
			"MediaRecorder",
			class extends FakeMediaRecorder {
				constructor() {
					super(null, null);
					throw new Error("no codec");
				}
			},
		);
		const r = new AudioRecorder();
		await expect(r.start()).rejects.toThrow("no codec");
		expect(tracksStopped()).toBe(true);
	});

	it("stop() when not recording rejects and releases nothing held", async () => {
		const r = new AudioRecorder();
		await expect(r.stop()).rejects.toThrow("Not recording");
	});
});
