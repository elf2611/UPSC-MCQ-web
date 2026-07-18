"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useState, useEffect, useMemo } from "react";
import { BookOpen, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import {
  QuestionFilterPanel,
  DEFAULT_FILTERS,
  FilterState,
  StatsSnapshot,
} from "@/components/filters/question-filter-panel";

// ── Session-start modal ──────────────────────────────────────────────────────

function StartModal({
  onClose,
  onStart,
  subjectName,
}: {
  onClose: () => void;
  onStart: (cfg: { mode: string; count: number }) => void;
  subjectName: string;
}) {
  const [mode, setMode] = useState<"practice" | "test">("practice");
  const [count, setCount] = useState(20);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Start {subjectName} Practice</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Mode</h3>
          <div className="grid grid-cols-2 gap-2">
            {(["practice", "test"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`py-2 rounded-lg text-sm font-bold border transition-colors ${
                  mode === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white/5 text-gray-300 border-white/10 hover:border-white/30"
                }`}
              >
                {m === "practice" ? "Practice (Feedback)" : "Test (No Feedback)"}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Question Count
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {[10, 20, 30, 50].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`py-2 rounded-lg text-sm font-bold border transition-colors ${
                  count === n
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white/5 text-gray-300 border-white/10 hover:border-white/30"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onStart({ mode, count })}
          className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 transition-colors"
        >
          Begin Session
        </button>
      </div>
    </div>
  );
}

// ── Subject card ─────────────────────────────────────────────────────────────

interface SubjectCard {
  id: string;
  name: string;
  desc: string;
  totalQs: number;
  attempted: number;
  accuracy: number;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PracticeTestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loadingStats, setLoadingStats] = useState(true);
  const [modalSubject, setModalSubject] = useState<string | null>(null);
  const [subjectCards, setSubjectCards] = useState<SubjectCard[]>([]);
  const [questionAttempts, setQuestionAttempts] = useState<Record<string, "correct" | "incorrect">>({});

  // Filters state — owned here, passed to panel
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // ── Fetch stats ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const token = await user.getIdToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [taxRes, statsRes] = await Promise.all([
          fetch("/api/subjects-topics", { headers }),
          fetch("/api/practice-tests/stats", { headers }),
        ]);

        if (!taxRes.ok || !statsRes.ok) return;

        const tax = await taxRes.json();
        const stats = await statsRes.json();

        const subjects: { id: string; name: string; description?: string }[] = tax.subjects || [];
        const questions: { id: string; subject_id: string }[] = stats.questions || [];
        const attempts: { question_id: string; is_correct: boolean }[] = stats.attempts || [];

        // Build attempt lookup for Status filter
        const attemptsMap: Record<string, "correct" | "incorrect"> = {};
        for (const a of attempts) {
          attemptsMap[a.question_id] = a.is_correct ? "correct" : "incorrect";
        }
        setQuestionAttempts(attemptsMap);

        // Build per-subject cards
        const cards: SubjectCard[] = subjects.map((sub) => {
          const subQs = questions.filter((q) => q.subject_id === sub.id);
          const subQIds = new Set(subQs.map((q) => q.id));
          const subAttempts = attempts.filter((a) => subQIds.has(a.question_id));
          const correct = subAttempts.filter((a) => a.is_correct).length;
          return {
            id: sub.id,
            name: sub.name,
            desc: sub.description || `${sub.name} questions for UPSC prep.`,
            totalQs: subQs.length,
            attempted: subAttempts.length,
            accuracy: subAttempts.length > 0 ? (correct / subAttempts.length) * 100 : 0,
          };
        });
        setSubjectCards(cards);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [user]);

  // ── Filter cards based on active filters ────────────────────────────────────
  const visibleCards = useMemo(() => {
    return subjectCards.filter((card) => {
      // subject filter
      if (filters.subjects.length > 0 && !filters.subjects.includes(card.id)) return false;
      // search
      if (filters.search && !card.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      // status filter on card level (rough: if subject has 0 attempted and filter=unsolved, keep)
      if (filters.status === "unsolved" && card.attempted > 0) return false;
      if (filters.status === "correct" && card.attempted === 0) return false;
      if (filters.status === "incorrect" && card.attempted === 0) return false;
      return true;
    });
  }, [subjectCards, filters]);

  const stats: StatsSnapshot = useMemo(() => {
    const total = visibleCards.reduce((s, c) => s + c.totalQs, 0);
    const solved = visibleCards.reduce((s, c) => s + c.attempted, 0);
    const correct = visibleCards.reduce(
      (s, c) => s + Math.round((c.accuracy / 100) * c.attempted),
      0
    );
    return {
      total,
      solved,
      accuracy: solved > 0 ? (correct / solved) * 100 : 0,
    };
  }, [visibleCards]);

  const handleStart = (cfg: { mode: string; count: number }) => {
    if (!modalSubject) return;
    const params = new URLSearchParams({
      mode: cfg.mode,
      subject: modalSubject,
      count: String(cfg.count),
      difficulty: filters.difficulty !== "all" ? filters.difficulty : "All Levels",
    });
    if (filters.topic) params.set("topic", filters.topic);
    if (filters.subtopic) params.set("subtopic", filters.subtopic);
    router.push(`/test-interface?${params.toString()}`);
  };

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (loadingStats) {
    return (
      <ProtectedRoute>
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-64 flex-shrink-0">
            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-5 h-80 animate-pulse" />
          </aside>
          <main className="flex-1">
            <div className="h-16 bg-[#1a1a1a] rounded-xl mb-8 animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6 h-64 animate-pulse" />
              ))}
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  if (subjectCards.length === 0) {
    return (
      <ProtectedRoute>
        <div className="max-w-7xl mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
          <span className="text-6xl mb-6">📚</span>
          <h2 className="text-3xl font-bold text-white mb-2">Question bank is being built</h2>
          <p className="text-gray-400 mb-8 max-w-md">
            Our team is adding questions. Check back soon or ask an admin to add questions.
          </p>
          <Link href="/" className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors">
            Go to Home
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      {modalSubject && (
        <StartModal
          subjectName={modalSubject}
          onClose={() => setModalSubject(null)}
          onStart={handleStart}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        {/* Unified Filter Panel */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-24">
            <QuestionFilterPanel
              mode="practice"
              filters={filters}
              onChange={setFilters}
              stats={stats}
              questionAttempts={questionAttempts}
            />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white tracking-tight">Practice Questions</h1>
            <p className="text-gray-400 mt-2">
              Master topics through targeted question banks.{" "}
              <span className="text-gray-500">{visibleCards.length} subjects shown</span>
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {visibleCards.map((card) => (
              <div
                key={card.id}
                className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6 flex flex-col hover:border-white/10 transition-colors"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                    <BookOpen className="w-5 h-5 text-gray-400" />
                  </div>
                  <span className="text-xs font-medium bg-white/5 text-gray-300 px-3 py-1 rounded-full border border-white/10">
                    {card.name}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2 leading-tight">{card.name}</h3>
                <p className="text-sm text-gray-400 mb-6 line-clamp-2">{card.desc}</p>

                <div className="mt-auto">
                  <div className="flex justify-between text-xs font-medium mb-2">
                    <span className="text-gray-500">Progress</span>
                    <span className="text-white">{card.attempted} / {card.totalQs} Qs</span>
                  </div>
                  <div className="w-full h-1.5 bg-background rounded-full overflow-hidden mb-6 border border-white/5">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: card.totalQs > 0 ? `${(card.attempted / card.totalQs) * 100}%` : "0%",
                      }}
                    />
                  </div>

                  {card.totalQs > 0 ? (
                    <button
                      onClick={() => setModalSubject(card.name)}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors border border-primary/20"
                    >
                      {card.attempted > 0 ? "Continue Practice" : "Start Practice"}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      disabled
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-semibold bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed"
                    >
                      0 questions available
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
