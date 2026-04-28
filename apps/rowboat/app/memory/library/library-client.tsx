"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  User,
  CheckSquare,
  Calendar,
  FileText,
  Trash2,
  Loader2,
  Inbox,
} from "lucide-react";

type EntityType = "all" | "person" | "commitment" | "event" | "note";

interface MemoryNode {
  id: string;
  userId: string;
  recordingId: string | null;
  entity: {
    type: string;
    name?: string;
    role?: string;
    company?: string;
    email?: string;
    description?: string;
    owner?: string;
    dueDate?: string;
    status?: string;
    title?: string;
    date?: string;
    attendeeNames?: string[];
    location?: string;
    outcome?: string;
    content?: string;
    tags?: string[];
    notes?: string;
  };
  createdAt: string;
}

const TABS: Array<{ key: EntityType; label: string; icon: React.ElementType }> =
  [
    { key: "all", label: "All", icon: Inbox },
    { key: "person", label: "People", icon: User },
    { key: "commitment", label: "Commitments", icon: CheckSquare },
    { key: "event", label: "Events", icon: Calendar },
    { key: "note", label: "Notes", icon: FileText },
  ];

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> =
  {
    person: {
      bg: "bg-[#D4A853]/10",
      text: "text-[#D4A853]",
      border: "border-[#D4A853]/25",
    },
    commitment: {
      bg: "bg-[#2D5A3D]/15",
      text: "text-[#6FA37F]",
      border: "border-[#2D5A3D]/40",
    },
    event: {
      bg: "bg-[#3A6B9B]/15",
      text: "text-[#7BA4CE]",
      border: "border-[#3A6B9B]/40",
    },
    note: {
      bg: "bg-white/5",
      text: "text-white/70",
      border: "border-white/10",
    },
  };

export function LibraryClient() {
  const [tab, setTab] = useState<EntityType>("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [nodes, setNodes] = useState<MemoryNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const fetchNodes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (tab !== "all") params.set("type", tab);
      if (debouncedQuery) params.set("q", debouncedQuery);
      params.set("limit", "100");

      const res = await fetch(`/api/memory?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to load memory");
        return;
      }
      const data = await res.json();
      setNodes(data);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [tab, debouncedQuery]);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this memory node? This can't be undone.")) return;
    try {
      const res = await fetch(`/api/memory?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setNodes((prev) => prev.filter((n) => n.id !== id));
      }
    } catch {
      // swallow
    }
  };

  const counts = TABS.reduce(
    (acc, t) => {
      acc[t.key] =
        t.key === "all"
          ? nodes.length
          : nodes.filter((n) => n.entity.type === t.key).length;
      return acc;
    },
    {} as Record<EntityType, number>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-8 py-16">
      <div className="mb-10">
        <h1
          className="text-4xl sm:text-5xl tracking-tight mb-3"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Your memory.
        </h1>
        <p className="text-white/60 text-lg">
          Every person, commitment, decision, and note — searchable and yours.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people, commitments, events, notes..."
          className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#D4A853]/50 focus:border-[#D4A853]/50 transition-all"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-8 border-b border-white/10 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                active
                  ? "border-[#D4A853] text-[#D4A853]"
                  : "border-transparent text-white/50 hover:text-white/80"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {counts[t.key] > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    active ? "bg-[#D4A853]/15" : "bg-white/10"
                  }`}
                >
                  {counts[t.key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-white/50">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading...
        </div>
      ) : error ? (
        <div className="text-center py-24 text-[#E86B6B]">{error}</div>
      ) : nodes.length === 0 ? (
        <div className="text-center py-24 text-white/50">
          <Inbox className="w-12 h-12 mx-auto mb-4 text-white/20" />
          <p className="text-lg mb-2">No memory yet</p>
          <p className="text-sm">
            Record a meeting or import from Fireflies to build your memory.
          </p>
          <a
            href="/memory"
            className="inline-block mt-6 px-5 py-2.5 bg-[#D4A853] text-[#0A0A0B] text-sm font-medium rounded-lg hover:bg-[#C4981F] transition-colors"
          >
            Record a meeting
          </a>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map((node) => {
            const colors =
              TYPE_COLORS[node.entity.type] ?? TYPE_COLORS.note;
            return (
              <div
                key={node.id}
                className={`group relative rounded-2xl border p-5 ${colors.bg} ${colors.border} hover:border-white/25 transition-all`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span
                    className={`text-[10px] uppercase tracking-wide font-medium ${colors.text}`}
                  >
                    {node.entity.type}
                  </span>
                  <button
                    onClick={() => handleDelete(node.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-[#E86B6B]"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <EntityBody entity={node.entity} />

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 text-xs text-white/40">
                  <span>
                    {new Date(node.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  {node.recordingId && (
                    <a
                      href={`/memory?recording=${node.recordingId}`}
                      className="hover:text-[#D4A853] transition-colors"
                    >
                      Source →
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EntityBody({ entity }: { entity: MemoryNode["entity"] }) {
  switch (entity.type) {
    case "person":
      return (
        <>
          <p className="font-medium text-base mb-1">
            {entity.name ?? "Unnamed person"}
          </p>
          {(entity.role || entity.company) && (
            <p className="text-sm text-white/60">
              {[entity.role, entity.company].filter(Boolean).join(" · ")}
            </p>
          )}
          {entity.email && (
            <p className="text-xs text-white/40 mt-1">{entity.email}</p>
          )}
          {entity.notes && (
            <p className="text-sm text-white/70 mt-2 line-clamp-3">
              {entity.notes}
            </p>
          )}
        </>
      );
    case "commitment":
      return (
        <>
          <p className="text-sm text-white/85 mb-2 line-clamp-3">
            {entity.description ?? "Commitment"}
          </p>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {entity.owner && (
              <span className="px-2 py-0.5 bg-white/5 rounded text-white/60">
                {entity.owner === "me" ? "You" : entity.owner}
              </span>
            )}
            {entity.dueDate && (
              <span className="px-2 py-0.5 bg-white/5 rounded text-white/60">
                Due {entity.dueDate}
              </span>
            )}
            {entity.status && (
              <span className="px-2 py-0.5 bg-white/5 rounded text-white/60">
                {entity.status}
              </span>
            )}
          </div>
        </>
      );
    case "event":
      return (
        <>
          <p className="font-medium text-base mb-1">
            {entity.title ?? "Event"}
          </p>
          {entity.date && (
            <p className="text-sm text-white/60 mb-2">{entity.date}</p>
          )}
          {entity.attendeeNames && entity.attendeeNames.length > 0 && (
            <p className="text-xs text-white/50 line-clamp-2">
              with {entity.attendeeNames.join(", ")}
            </p>
          )}
          {entity.outcome && (
            <p className="text-sm text-white/70 mt-2 line-clamp-2">
              {entity.outcome}
            </p>
          )}
        </>
      );
    case "note":
      return (
        <>
          <p className="text-sm text-white/85 line-clamp-4">
            {entity.content ?? "Note"}
          </p>
          {entity.tags && entity.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {entity.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-white/50"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </>
      );
    default:
      return (
        <p className="text-sm text-white/70">
          {JSON.stringify(entity).slice(0, 120)}...
        </p>
      );
  }
}
