"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, RotateCcw, BookmarkCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestionStatus = "all" | "unsolved" | "correct" | "incorrect";

export interface FilterState {
  search: string;
  subjects: string[];      // subject IDs (empty = all)
  years: number[];         // selected years (empty = all)
  difficulty: string;      // "all" | "Easy" | "Medium" | "Hard"
  status: QuestionStatus;
  bookmarkedOnly: boolean;
  topic: string;           // single topic name (for session start)
  subtopic: string;        // single subtopic name (for session start)
}

export const DEFAULT_FILTERS: FilterState = {
  search: "",
  subjects: [],
  years: [],
  difficulty: "all",
  status: "all",
  bookmarkedOnly: false,
  topic: "",
  subtopic: "",
};

interface Subject { id: string; name: string; slug: string; }
interface Topic   { id: string; name: string; slug: string; subject_id: string; }
interface Subtopic{ id: string; name: string; slug: string; topic_id: string; }

export interface StatsSnapshot {
  total: number;
  solved: number;
  accuracy: number;
}

interface QuestionFilterPanelProps {
  /** Which page context — controls which filter sections are shown */
  mode: "practice" | "mock" | "pyq";
  filters: FilterState;
  onChange: (f: FilterState) => void;
  stats?: StatsSnapshot;
  /** Optional – a list of question records so we can compute "status" filter counts */
  questionAttempts?: Record<string, "correct" | "incorrect">;
}

// ─── Chip component ────────────────────────────────────────────────────────────

function Chip({
  label,
  active,
  onClick,
  color = "primary",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: "primary" | "amber" | "emerald";
}) {
  const activeClass =
    color === "amber"
      ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
      : color === "emerald"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
      : "bg-primary/20 text-primary border-primary/50";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 whitespace-nowrap ${
        active
          ? activeClass
          : "bg-white/5 text-gray-400 border-white/10 hover:border-white/30 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Collapsible Section ───────────────────────────────────────────────────────

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/5 py-4">
      <button
        type="button"
        className="flex items-center justify-between w-full text-left"
        onClick={() => setOpen((p) => !p)}
      >
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          {title}
        </span>
        {open ? (
          <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
        )}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function QuestionFilterPanel({
  mode,
  filters,
  onChange,
  stats,
  questionAttempts = {},
}: QuestionFilterPanelProps) {
  const { user } = useAuth();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Fetch taxonomy + years ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const token = await user.getIdToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [taxRes, yearRes] = await Promise.all([
          fetch("/api/subjects-topics", { headers }),
          mode === "pyq"
            ? fetch("/api/pyq-tests/years", { headers })
            : Promise.resolve(null),
        ]);

        if (taxRes.ok) {
          const tax = await taxRes.json();
          setSubjects(tax.subjects || []);
          setTopics(tax.topics || []);
          setSubtopics(tax.subtopics || []);
        }

        if (yearRes?.ok) {
          const yd = await yearRes.json();
          setAvailableYears(yd.years || []);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user, mode]);

  // ── Derived: subtopics visible given selected topic ─────────────────────────
  const activeTopicId = useMemo(() => {
    if (!filters.topic) return null;
    return topics.find((t) => t.name === filters.topic)?.id ?? null;
  }, [filters.topic, topics]);

  const visibleSubtopics = useMemo(() => {
    if (!activeTopicId) return [];
    return subtopics.filter((st) => st.topic_id === activeTopicId);
  }, [activeTopicId, subtopics]);

  // ── Derived: topics for selected subjects ────────────────────────────────────
  const relevantTopics = useMemo(() => {
    if (filters.subjects.length === 0) return topics;
    const subjectIds = new Set(filters.subjects);
    return topics.filter((t) => subjectIds.has(t.subject_id));
  }, [filters.subjects, topics]);

  // ── Update helpers ───────────────────────────────────────────────────────────
  const set = useCallback(
    (partial: Partial<FilterState>) => onChange({ ...filters, ...partial }),
    [filters, onChange]
  );

  const toggleSubject = (id: string) => {
    const next = filters.subjects.includes(id)
      ? filters.subjects.filter((s) => s !== id)
      : [...filters.subjects, id];
    // Clear topic/subtopic if they no longer belong to selected subjects
    const validTopicIds = new Set(
      topics.filter((t) => next.length === 0 || next.includes(t.subject_id)).map((t) => t.id)
    );
    const topicStillValid = !filters.topic || topics.some(
      (t) => t.name === filters.topic && validTopicIds.has(t.id)
    );
    set({
      subjects: next,
      topic: topicStillValid ? filters.topic : "",
      subtopic: topicStillValid ? filters.subtopic : "",
    });
  };

  const toggleYear = (y: number) => {
    const next = filters.years.includes(y)
      ? filters.years.filter((yr) => yr !== y)
      : [...filters.years, y];
    set({ years: next });
  };

  const reset = () => onChange({ ...DEFAULT_FILTERS });

  const hasActiveFilters =
    filters.search ||
    filters.subjects.length > 0 ||
    filters.years.length > 0 ||
    filters.difficulty !== "all" ||
    filters.status !== "all" ||
    filters.bookmarkedOnly ||
    filters.topic ||
    filters.subtopic;

  if (loading) {
    return (
      <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-5 animate-pulse h-80" />
    );
  }

  return (
    <div className="bg-[#1a1a1a] border border-white/5 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={reset}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      <div className="px-5 overflow-y-auto max-h-[calc(100vh-220px)]">

        {/* Stats Card */}
        {stats && (
          <div className="mt-4 mb-2 grid grid-cols-3 gap-2 bg-white/[0.03] border border-white/5 rounded-lg p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-white">{stats.total}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Total</div>
            </div>
            <div className="text-center border-x border-white/5">
              <div className="text-lg font-bold text-emerald-400">{stats.solved}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Solved</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-400">
                {stats.accuracy > 0 ? `${Math.round(stats.accuracy)}%` : "—"}
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Accuracy</div>
            </div>
          </div>
        )}

        {/* Search */}
        <Section title="Search Keywords">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search questions..."
              value={filters.search}
              onChange={(e) => set({ search: e.target.value })}
              className="w-full bg-background border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </Section>

        {/* Subject – multi-select chips */}
        <Section title="Subject">
          <div className="flex flex-wrap gap-1.5">
            <Chip
              label="All"
              active={filters.subjects.length === 0}
              onClick={() => set({ subjects: [], topic: "", subtopic: "" })}
            />
            <Chip
              label="None"
              active={filters.subjects.length === subjects.length && subjects.length > 0}
              onClick={() =>
                set({
                  subjects: subjects.map((s) => s.id),
                  topic: "",
                  subtopic: "",
                })
              }
            />
            {subjects.map((s) => (
              <Chip
                key={s.id}
                label={s.name}
                active={filters.subjects.includes(s.id)}
                onClick={() => toggleSubject(s.id)}
                color="primary"
              />
            ))}
          </div>
        </Section>

        {/* Topic — shows once subjects are filtered */}
        {relevantTopics.length > 0 && (
          <Section title="Topic" defaultOpen={!!filters.topic}>
            <div className="flex flex-wrap gap-1.5">
              <Chip
                label="All"
                active={!filters.topic}
                onClick={() => set({ topic: "", subtopic: "" })}
              />
              {relevantTopics.map((t) => (
                <Chip
                  key={t.id}
                  label={t.name}
                  active={filters.topic === t.name}
                  onClick={() =>
                    set({
                      topic: filters.topic === t.name ? "" : t.name,
                      subtopic: "",
                    })
                  }
                  color="emerald"
                />
              ))}
            </div>
          </Section>
        )}

        {/* Subtopic — cascades from selected topic */}
        {filters.topic && visibleSubtopics.length > 0 && (
          <Section title="Subtopic" defaultOpen>
            <div className="flex flex-wrap gap-1.5">
              <Chip
                label="All"
                active={!filters.subtopic}
                onClick={() => set({ subtopic: "" })}
              />
              {visibleSubtopics.map((st) => (
                <Chip
                  key={st.id}
                  label={st.name}
                  active={filters.subtopic === st.name}
                  onClick={() =>
                    set({ subtopic: filters.subtopic === st.name ? "" : st.name })
                  }
                  color="amber"
                />
              ))}
            </div>
          </Section>
        )}

        {/* Exam Year — only for PYQ mode */}
        {mode === "pyq" && availableYears.length > 0 && (
          <Section title="Exam Year">
            <div className="flex flex-wrap gap-1.5">
              <Chip
                label="All"
                active={filters.years.length === 0}
                onClick={() => set({ years: [] })}
              />
              <Chip
                label="None"
                active={filters.years.length === availableYears.length}
                onClick={() => set({ years: [...availableYears] })}
              />
              {availableYears.map((y) => (
                <Chip
                  key={y}
                  label={String(y)}
                  active={filters.years.includes(y)}
                  onClick={() => toggleYear(y)}
                  color="amber"
                />
              ))}
            </div>
          </Section>
        )}

        {/* Difficulty */}
        <Section title="Difficulty">
          <div className="flex flex-wrap gap-1.5">
            {["all", "Easy", "Medium", "Hard"].map((d) => (
              <Chip
                key={d}
                label={d === "all" ? "All" : d}
                active={filters.difficulty === d}
                onClick={() => set({ difficulty: d })}
                color={
                  d === "Easy" ? "emerald" : d === "Hard" ? "primary" : "primary"
                }
              />
            ))}
          </div>
        </Section>

        {/* Status — based on attempt history */}
        {Object.keys(questionAttempts).length > 0 && (
          <Section title="Status">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { value: "all", label: "All" },
                  { value: "unsolved", label: "Unsolved" },
                  { value: "correct", label: "Correct" },
                  { value: "incorrect", label: "Incorrect" },
                ] as { value: QuestionStatus; label: string }[]
              ).map(({ value, label }) => (
                <Chip
                  key={value}
                  label={label}
                  active={filters.status === value}
                  onClick={() => set({ status: value })}
                  color={
                    value === "correct"
                      ? "emerald"
                      : value === "incorrect"
                      ? "primary"
                      : "primary"
                  }
                />
              ))}
            </div>
          </Section>
        )}

        {/* Bookmarked Only */}
        <div className="py-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              className={`w-5 h-5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                filters.bookmarkedOnly
                  ? "bg-amber-500 border-amber-500"
                  : "border-white/20 bg-background group-hover:border-white/40"
              }`}
              onClick={() => set({ bookmarkedOnly: !filters.bookmarkedOnly })}
            >
              {filters.bookmarkedOnly && (
                <BookmarkCheck className="w-3 h-3 text-white" />
              )}
            </div>
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
              Bookmarked Only
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
