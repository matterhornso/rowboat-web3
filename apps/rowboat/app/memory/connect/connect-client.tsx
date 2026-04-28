"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, AlertCircle, Download, Flame } from "lucide-react";

interface FirefliesStatus {
  connected: boolean;
  email?: string;
  connectedAt?: string;
}

interface ImportPreview {
  transcripts: Array<{
    id: string;
    title: string;
    date: string;
    duration: number;
    sentenceCount: number;
    imported: boolean;
  }>;
}

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errored: number;
}

export function ConnectClient() {
  const [status, setStatus] = useState<FirefliesStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/fireflies/connect");
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch {
      // swallow
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (status?.connected) {
      void fetchPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected]);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    try {
      const res = await fetch("/api/fireflies/import?limit=20");
      if (res.ok) {
        setPreview(await res.json());
      }
    } catch {
      // swallow
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    setConnecting(true);
    setError("");

    try {
      const res = await fetch("/api/fireflies/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail ?? data.error ?? "Failed to connect.");
        return;
      }

      await fetchStatus();
      setApiKey("");
    } catch {
      setError("Network error.");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Fireflies? Your API key will be removed."))
      return;
    try {
      await fetch("/api/fireflies/connect", { method: "DELETE" });
      setStatus({ connected: false });
      setPreview(null);
      setImportResult(null);
    } catch {
      // swallow
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setError("");
    setImportResult(null);

    try {
      const res = await fetch("/api/fireflies/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 25 }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail ?? data.error ?? "Import failed.");
        return;
      }

      setImportResult(await res.json());
      void fetchPreview();
    } catch {
      setError("Network error during import.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-8 py-16">
      <div className="mb-10">
        <h1
          className="text-4xl sm:text-5xl tracking-tight mb-3"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Connect your memory sources.
        </h1>
        <p className="text-white/60 text-lg max-w-2xl">
          Already using Fireflies, Otter, or Granola? Pull in your history on
          day one. No re-recording required.
        </p>
      </div>

      {/* Fireflies card */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#D4A853]/10 border border-[#D4A853]/30 rounded-xl flex items-center justify-center">
              <Flame className="w-6 h-6 text-[#D4A853]" />
            </div>
            <div>
              <h2 className="text-xl font-medium mb-1">Fireflies.ai</h2>
              <p className="text-sm text-white/50">
                Import every transcript from your Fireflies workspace.
              </p>
            </div>
          </div>
          {status?.connected && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#2D5A3D]/15 border border-[#2D5A3D]/40 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#6FA37F]" />
              <span className="text-xs text-[#6FA37F] font-medium">
                Connected
              </span>
            </div>
          )}
        </div>

        {!status ? (
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking connection...
          </div>
        ) : !status.connected ? (
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-white/80">
                Fireflies API key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your Fireflies API key"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50 focus:border-[#D4A853]/50 transition-all"
              />
              <p className="text-xs text-white/40 mt-2">
                Get your key at{" "}
                <a
                  href="https://app.fireflies.ai/integrations/custom/fireflies"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#D4A853] hover:underline"
                >
                  app.fireflies.ai → Integrations → API
                </a>
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-[#E86B6B]/10 border border-[#E86B6B]/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-[#E86B6B] shrink-0 mt-0.5" />
                <p className="text-sm text-[#E86B6B]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={connecting || !apiKey.trim()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4A853] text-[#0A0A0B] text-sm font-medium rounded-xl hover:bg-[#C4981F] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validating...
                </>
              ) : (
                "Connect Fireflies"
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
              <div>
                <p className="text-sm text-white/80 font-medium">
                  {status.email}
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  Connected{" "}
                  {status.connectedAt &&
                    new Date(status.connectedAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-sm text-white/50 hover:text-[#E86B6B] transition-colors"
              >
                Disconnect
              </button>
            </div>

            {/* Preview */}
            {loadingPreview ? (
              <div className="flex items-center gap-2 text-white/50 text-sm py-6">
                <Loader2 className="w-4 h-4 animate-spin" />
                Looking at your Fireflies workspace...
              </div>
            ) : preview && preview.transcripts.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-white/80">
                    Recent transcripts ({preview.transcripts.length})
                  </h3>
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4A853] text-[#0A0A0B] text-sm font-medium rounded-lg hover:bg-[#C4981F] transition-colors disabled:opacity-60"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        Import all
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-2">
                  {preview.transcripts.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-lg hover:border-white/10 transition-all"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="text-sm text-white/85 truncate">
                          {t.title}
                        </p>
                        <p className="text-xs text-white/40 mt-0.5">
                          {new Date(t.date).toLocaleDateString()} ·{" "}
                          {Math.round(t.duration / 60)} min ·{" "}
                          {t.sentenceCount} sentences
                        </p>
                      </div>
                      {t.imported ? (
                        <span className="text-xs text-[#6FA37F] shrink-0 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Imported
                        </span>
                      ) : (
                        <span className="text-xs text-white/40 shrink-0">
                          Pending
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : preview && preview.transcripts.length === 0 ? (
              <p className="text-sm text-white/50 py-4">
                No transcripts found in your Fireflies workspace yet.
              </p>
            ) : null}

            {importResult && (
              <div className="p-4 bg-[#2D5A3D]/10 border border-[#2D5A3D]/30 rounded-xl">
                <p className="text-sm font-medium text-[#6FA37F] mb-1">
                  Import complete
                </p>
                <p className="text-xs text-white/60">
                  {importResult.imported} imported · {importResult.skipped}{" "}
                  skipped · {importResult.errored} errored (out of{" "}
                  {importResult.total} transcripts).{" "}
                  <a
                    href="/memory/library"
                    className="text-[#D4A853] hover:underline"
                  >
                    View your memory →
                  </a>
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-[#E86B6B]/10 border border-[#E86B6B]/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-[#E86B6B] shrink-0 mt-0.5" />
                <p className="text-sm text-[#E86B6B]">{error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Coming soon: Otter, Granola */}
      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        {[
          { name: "Otter.ai", desc: "Pull your Otter conversations" },
          { name: "Granola", desc: "Sync your Granola notes" },
        ].map((source) => (
          <div
            key={source.name}
            className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 opacity-60"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-base font-medium">{source.name}</h3>
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 bg-white/5 rounded text-white/40">
                Soon
              </span>
            </div>
            <p className="text-sm text-white/50">{source.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
