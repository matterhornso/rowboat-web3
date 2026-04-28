"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, Check, RefreshCw, User } from "lucide-react";

interface BriefResponse {
  brief: string;
  memoryNodesUsed: number;
  personName?: string;
  topic?: string;
}

export function BriefClient() {
  const [personName, setPersonName] = useState("");
  const [topic, setTopic] = useState("");
  const [meetingContext, setMeetingContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BriefResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim() && !topic.trim()) {
      setError("Enter a person or a topic.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personName: personName.trim() || undefined,
          topic: topic.trim() || undefined,
          meetingContext: meetingContext.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to generate brief.");
        return;
      }

      const data: BriefResponse = await res.json();
      setResult(data);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.brief);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setResult(null);
    setError("");
  };

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-8 py-16">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#D4A853]/10 border border-[#D4A853]/30 rounded-full mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[#D4A853]" />
          <span className="text-xs tracking-wide uppercase text-[#D4A853] font-medium">
            Pre-meeting brief
          </span>
        </div>
        <h1
          className="text-4xl sm:text-5xl tracking-tight mb-3"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Walk in prepared.
        </h1>
        <p className="text-white/60 text-lg max-w-2xl">
          Tell us who or what. We&apos;ll synthesize your memory into a brief
          you can read in 90 seconds.
        </p>
      </div>

      {!result ? (
        <form
          onSubmit={handleGenerate}
          className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium mb-2 text-white/80">
              Who are you meeting?
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Sarah Chen"
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50 focus:border-[#D4A853]/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/80">
              Topic or company{" "}
              <span className="text-white/40 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Acme Corp deal, SOC 2, pricing negotiation..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50 focus:border-[#D4A853]/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white/80">
              Context for this meeting{" "}
              <span className="text-white/40 font-normal">(optional)</span>
            </label>
            <textarea
              value={meetingContext}
              onChange={(e) => setMeetingContext(e.target.value)}
              rows={3}
              placeholder="30-min call to finalize pricing and launch timing. They want to push the contract to 24 months..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50 focus:border-[#D4A853]/50 transition-all resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-[#E86B6B] -mt-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#D4A853] text-[#0A0A0B] text-sm font-medium rounded-xl hover:bg-[#C4981F] transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Synthesizing your memory...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate brief
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Brief header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#D4A853] mb-1">
                Brief
                {result.personName && ` · ${result.personName}`}
                {result.topic && !result.personName && ` · ${result.topic}`}
              </p>
              <p className="text-sm text-white/50">
                Synthesized from {result.memoryNodesUsed} memory{" "}
                {result.memoryNodesUsed === 1 ? "node" : "nodes"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#6FA37F]" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                New brief
              </button>
            </div>
          </div>

          {/* Brief body */}
          <article className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 lg:p-10">
            <BriefRenderer text={result.brief} />
          </article>

          {result.memoryNodesUsed === 0 && (
            <div className="text-center p-6 bg-[#D4A853]/5 border border-[#D4A853]/20 rounded-xl text-sm text-white/70">
              No matching memory found yet. Record a meeting or import from
              Fireflies to seed your memory graph.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Lightweight markdown-ish renderer so **bold** and numbered lists read well.
// Kept tiny intentionally — full markdown pulls in a dep we don't need yet.
function BriefRenderer({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="prose prose-invert max-w-none text-white/85 leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-3" />;

        // Headers (# or ##)
        if (line.startsWith("## ")) {
          return (
            <h3
              key={i}
              className="text-lg font-medium text-[#D4A853] mt-6 mb-2"
            >
              {renderInline(line.slice(3))}
            </h3>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <h2
              key={i}
              className="text-xl font-medium mt-6 mb-3"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {renderInline(line.slice(2))}
            </h2>
          );
        }

        // Numbered list items (1. ...)
        const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={i} className="flex gap-3 my-1.5">
              <span className="text-[#D4A853] font-medium shrink-0">
                {numMatch[1]}.
              </span>
              <span>{renderInline(numMatch[2])}</span>
            </div>
          );
        }

        // Bullet items (- or *)
        if (line.match(/^\s*[-*]\s+/)) {
          return (
            <div key={i} className="flex gap-3 my-1 pl-2">
              <span className="text-[#D4A853] shrink-0">•</span>
              <span>{renderInline(line.replace(/^\s*[-*]\s+/, ""))}</span>
            </div>
          );
        }

        return (
          <p key={i} className="my-2">
            {renderInline(line)}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  // Split on **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-white font-medium">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
