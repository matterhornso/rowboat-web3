"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, Square, Upload, Loader2, ChevronRight, Brain } from "lucide-react";

type ProcessingStatus = "idle" | "recording" | "uploading" | "done" | "error";

interface ExtractedEntity {
    type: string;
    name?: string;
    description?: string;
    content?: string;
    title?: string;
    [key: string]: unknown;
}

interface VoiceResult {
    recordingId: string;
    transcript: string;
    durationSeconds?: number;
    extractedEntities: ExtractedEntity[];
    entityCount: number;
}

// Minimal Wake Lock typing — we can't extend Navigator here because lib.dom already
// declares `wakeLock` as a non-optional WakeLock. Detect support via a local helper.
interface WakeLockSentinelLike {
    release: () => Promise<void>;
    addEventListener: (type: "release", listener: () => void) => void;
}

interface WakeLockLike {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
}

function getWakeLock(): WakeLockLike | null {
    if (typeof navigator === "undefined") return null;
    const candidate = (navigator as unknown as { wakeLock?: unknown }).wakeLock;
    if (!candidate || typeof (candidate as WakeLockLike).request !== "function") {
        return null;
    }
    return candidate as WakeLockLike;
}

// Pick the best audio mime the browser supports. Safari on iOS prefers mp4.
function pickMimeType(): string | undefined {
    if (typeof MediaRecorder === "undefined") return undefined;
    const candidates = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/mpeg",
        "audio/ogg;codecs=opus",
    ];
    for (const type of candidates) {
        if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return undefined;
}

export function RecordingClient() {
    const [status, setStatus] = useState<ProcessingStatus>("idle");
    const [recordingTime, setRecordingTime] = useState(0);
    const [result, setResult] = useState<VoiceResult | null>(null);
    const [error, setError] = useState("");
    const [title, setTitle] = useState("");
    const [isStandalone, setIsStandalone] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
    const mimeTypeRef = useRef<string | undefined>(undefined);

    // Detect if launched as installed PWA — used to subtly switch the hint
    useEffect(() => {
        if (typeof window === "undefined") return;
        const standalone =
            window.matchMedia?.("(display-mode: standalone)").matches ||
            // iOS quirk — non-standard
            (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
        setIsStandalone(Boolean(standalone));
    }, []);

    // Re-acquire wake lock if user tabs away and back during recording
    useEffect(() => {
        const onVisibility = async () => {
            if (document.visibilityState !== "visible") return;
            if (status !== "recording") return;
            if (wakeLockRef.current) return;
            try {
                const wl = getWakeLock();
                if (wl) {
                    wakeLockRef.current = await wl.request("screen");
                }
            } catch {
                // Ignore — wake lock is progressive enhancement
            }
        };
        document.addEventListener("visibilitychange", onVisibility);
        return () => document.removeEventListener("visibilitychange", onVisibility);
    }, [status]);

    const releaseWakeLock = useCallback(async () => {
        try {
            await wakeLockRef.current?.release();
        } catch {
            // ignore
        }
        wakeLockRef.current = null;
    }, []);

    const startRecording = useCallback(async () => {
        setError("");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            const mimeType = pickMimeType();
            mimeTypeRef.current = mimeType;
            const recorder = mimeType
                ? new MediaRecorder(stream, { mimeType })
                : new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.start(250);
            setStatus("recording");
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime((t) => t + 1);
            }, 1000);

            // Request wake lock so the mic doesn't get suspended when the screen dims
            try {
                const wl = getWakeLock();
                if (wl) {
                    wakeLockRef.current = await wl.request("screen");
                    wakeLockRef.current.addEventListener("release", () => {
                        wakeLockRef.current = null;
                    });
                }
            } catch {
                // Wake lock is nice-to-have, not required
            }
        } catch {
            setError("Could not access microphone. Check permissions.");
        }
    }, []);

    const stopAndUpload = useCallback(async () => {
        if (!mediaRecorderRef.current) return;

        if (timerRef.current) clearInterval(timerRef.current);
        setStatus("uploading");

        const recorder = mediaRecorderRef.current;
        recorder.stream.getTracks().forEach((t) => t.stop());

        // Wait for final data
        await new Promise<void>((resolve) => {
            recorder.onstop = () => resolve();
            recorder.stop();
        });

        await releaseWakeLock();

        const mime = mimeTypeRef.current ?? "audio/webm";
        const ext = mime.includes("mp4")
            ? "m4a"
            : mime.includes("mpeg")
            ? "mp3"
            : mime.includes("ogg")
            ? "ogg"
            : "webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        const formData = new FormData();
        formData.append("audio", blob, `recording.${ext}`);
        if (title) formData.append("title", title);

        try {
            const res = await fetch("/api/voice", { method: "POST", body: formData });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? "Upload failed");
            }
            const data: VoiceResult = await res.json();
            setResult(data);
            setStatus("done");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong");
            setStatus("error");
        }
    }, [title, releaseWakeLock]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            wakeLockRef.current?.release().catch(() => {});
        };
    }, []);

    const reset = () => {
        setStatus("idle");
        setResult(null);
        setError("");
        setRecordingTime(0);
        setTitle("");
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    const entityLabel = (e: ExtractedEntity) => {
        return e.name ?? e.title ?? e.description?.slice(0, 60) ?? e.content?.slice(0, 60) ?? "—";
    };

    const entityTypeColor: Record<string, string> = {
        person: "bg-[#D4A853]/20 text-[#D4A853]",
        commitment: "bg-[#2D5A3D]/30 text-[#5DBF7A]",
        event: "bg-[#3A6B9B]/20 text-[#6BA3D4]",
        note: "bg-[#5A554B]/40 text-[#C4BFB3]",
    };

    return (
        <div
            className="max-w-2xl mx-auto px-5 sm:px-6 pt-8 sm:pt-12 pb-12"
            style={{ paddingBottom: "max(3rem, env(safe-area-inset-bottom))" }}
        >
            {/* Header */}
            <div className="mb-8 sm:mb-12">
                <div className="flex items-center gap-3 mb-3">
                    <Brain className="w-6 h-6 text-[#D4A853]" />
                    <span className="text-xs uppercase tracking-[0.12em] text-[#7D776B] font-medium">
                        Autonomous Memory
                    </span>
                </div>
                <h1 className="font-[family-name:var(--font-instrument-serif)] text-3xl sm:text-4xl text-[#FAFAF8] leading-tight">
                    Record a conversation
                </h1>
                <p className="mt-2 text-[#7D776B] text-sm">
                    Speak freely. AI extracts people, commitments, and key context automatically.
                </p>
                {!isStandalone && status === "idle" && (
                    <p className="mt-3 text-[11px] text-[#5A554B] sm:hidden">
                        Tip: add to home screen for a full-screen, native-feeling app.
                    </p>
                )}
            </div>

            {/* Title input */}
            {status === "idle" && (
                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Meeting title (optional)"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        enterKeyHint="done"
                        autoCapitalize="sentences"
                        className="w-full bg-[#1A1918] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3.5 text-base sm:text-sm text-[#FAFAF8] placeholder:text-[#5A554B] focus:outline-none focus:ring-2 focus:ring-[#D4A853]/40 focus:border-[#D4A853]/40 transition-all"
                    />
                </div>
            )}

            {/* Recording control */}
            <div className="flex flex-col items-center gap-6 py-8 sm:py-10">
                {status === "idle" && (
                    <button
                        onClick={startRecording}
                        aria-label="Start recording"
                        className="w-28 h-28 sm:w-24 sm:h-24 rounded-full bg-[#D4A853] hover:bg-[#C4981F] flex items-center justify-center transition-all shadow-lg shadow-[#D4A853]/20 active:scale-95 sm:hover:scale-105 touch-manipulation"
                    >
                        <Mic className="w-10 h-10 sm:w-9 sm:h-9 text-[#0A0A0B]" />
                    </button>
                )}

                {status === "recording" && (
                    <>
                        <div className="relative">
                            {/* Pulse rings */}
                            <div className="absolute inset-0 rounded-full bg-[#D4A853]/20 animate-ping scale-125" />
                            <div className="absolute inset-0 rounded-full bg-[#D4A853]/10 animate-ping scale-150 animation-delay-150" />
                            <button
                                onClick={stopAndUpload}
                                aria-label="Stop recording and process"
                                className="relative w-28 h-28 sm:w-24 sm:h-24 rounded-full bg-[#B33A3A] hover:bg-[#9A2A2A] flex items-center justify-center transition-all shadow-lg shadow-[#B33A3A]/20 z-10 active:scale-95 touch-manipulation"
                            >
                                <Square className="w-9 h-9 sm:w-8 sm:h-8 text-white fill-white" />
                            </button>
                        </div>
                        <div className="font-mono text-3xl sm:text-2xl text-[#D4A853] tabular-nums">
                            {formatTime(recordingTime)}
                        </div>
                        <p className="text-xs text-[#5A554B]">Tap to stop and process</p>
                    </>
                )}

                {status === "uploading" && (
                    <>
                        <div className="w-24 h-24 rounded-full bg-[#1A1918] border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-[#D4A853] animate-spin" />
                        </div>
                        <div className="text-sm text-[#7D776B] flex items-center gap-2 text-center">
                            <Upload className="w-4 h-4 shrink-0" />
                            Transcribing and extracting memory...
                        </div>
                    </>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="mt-4 px-4 py-3 bg-[#B33A3A]/15 border border-[#B33A3A]/30 rounded-xl text-sm text-[#D4706B]">
                    {error}
                    <button onClick={reset} className="ml-3 underline opacity-70 hover:opacity-100">
                        Try again
                    </button>
                </div>
            )}

            {/* Results */}
            {status === "done" && result && (
                <div className="mt-2 space-y-6">
                    {/* Entity summary */}
                    <div className="p-5 bg-[#1A1918] border border-[rgba(255,255,255,0.06)] rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-medium text-[#FAFAF8]">
                                {result.entityCount} memory nodes extracted
                            </h2>
                            <span className="text-xs text-[#5A554B]">
                                {result.durationSeconds ? `${Math.round(result.durationSeconds)}s` : ""}
                            </span>
                        </div>

                        {result.extractedEntities.length === 0 ? (
                            <p className="text-sm text-[#5A554B]">No structured entities found. Raw transcript saved.</p>
                        ) : (
                            <div className="space-y-2">
                                {result.extractedEntities.map((e, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${entityTypeColor[e.type] ?? "bg-white/10 text-white/60"}`}>
                                            {e.type}
                                        </span>
                                        <span className="text-sm text-[#C4BFB3] truncate">
                                            {entityLabel(e)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Transcript preview */}
                    <div className="p-5 bg-[#1A1918] border border-[rgba(255,255,255,0.06)] rounded-2xl">
                        <h2 className="text-xs uppercase tracking-wider text-[#5A554B] mb-3">Transcript</h2>
                        <p className="text-sm text-[#7D776B] leading-relaxed line-clamp-6">
                            {result.transcript || "No transcript available."}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={reset}
                            className="flex-1 px-5 py-3.5 sm:py-3 bg-[#1A1918] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm text-[#FAFAF8] hover:bg-[#252320] transition-colors"
                        >
                            New recording
                        </button>
                        <a
                            href="/memory/library"
                            className="flex items-center justify-center gap-2 px-5 py-3.5 sm:py-3 bg-[#D4A853] rounded-xl text-sm font-medium text-[#0A0A0B] hover:bg-[#C4981F] transition-colors"
                        >
                            View all memory
                            <ChevronRight className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}
