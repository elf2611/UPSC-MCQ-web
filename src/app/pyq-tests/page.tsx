"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useState, useEffect, useMemo } from "react";
import { ChevronRight, X, Trophy } from "lucide-react";
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
  onStart: (cfg: { count: number }) => void;
  subjectName: string;
}) {
  const [count, setCount] = useState(20);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card shadow-surface rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-display font-bold text-foreground">Start {subjectName} PYQs</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-2 p-3 bg-amber-500/10  rounded-lg flex items-start gap-2">
          <Trophy className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-300">
            Previous Year Questions — UPSC-style negative marking applies (−⅓ per wrong answer)
          </p>
        </div>

        <div className="mt-6 mb-8">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
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
                    : "bg-secondary text-muted-foreground border-white/10 hover:border-white/30"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onStart({ count })}
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

export default function PYQTestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loadingStats, setLoadingStats] = useState(true);
  const [modalSubject, setModalSubject] = useState<string | null>(null);
  const [subjectCards, setSubjectCards] = useState<SubjectCard[]>([]);
  const [questionAttempts, setQuestionAttempts] = useState<Record<string, "correct" | "incorrect">>({});

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
          fetch("/api/practice-tests/stats?mode=pyq", { headers }),
        ]);

        if (!taxRes.ok || !statsRes.ok) return;

        const tax = await taxRes.json();
        const stats = await statsRes.json();

        const subjects: { id: string; name: string; description?: string }[] = tax.subjects || [];
        const questions: { id: string; subject_id: string }[] = stats.questions || [];
        const attempts: { question_id: string; is_correct: boolean }[] = stats.attempts || [];

        const attemptsMap: Record<string, "correct" | "incorrect"> = {};
        for (const a of attempts) {
          attemptsMap[a.question_id] = a.is_correct ? "correct" : "incorrect";
        }
        setQuestionAttempts(attemptsMap);

        const cards: SubjectCard[] = subjects
          .map((sub) => {
            const subQs = questions.filter((q) => q.subject_id === sub.id);
            const subQIds = new Set(subQs.map((q) => q.id));
            const subAttempts = attempts.filter((a) => subQIds.has(a.question_id));
            const correct = subAttempts.filter((a) => a.is_correct).length;
            return {
              id: sub.id,
              name: sub.name,
              desc: sub.description || `Authentic ${sub.name} PYQs for UPSC prep.`,
              totalQs: subQs.length,
              attempted: subAttempts.length,
              accuracy: subAttempts.length > 0 ? (correct / subAttempts.length) * 100 : 0,
            };
          })
          .filter((c) => c.totalQs > 0); // only show subjects that have PYQs

        setSubjectCards(cards);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [user]);

  // ── Filter cards ─────────────────────────────────────────────────────────────
  const visibleCards = useMemo(() => {
    return subjectCards.filter((card) => {
      if (filters.subjects.length > 0 && !filters.subjects.includes(card.id)) return false;
      if (filters.search && !card.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
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
    return { total, solved, accuracy: solved > 0 ? (correct / solved) * 100 : 0 };
  }, [visibleCards]);

  const handleStart = (cfg: { count: number }) => {
    if (!modalSubject) return;
    const params = new URLSearchParams({
      mode: "pyq",
      subject: modalSubject,
      count: String(cfg.count),
      difficulty: filters.difficulty !== "all" ? filters.difficulty : "All Levels",
    });
    if (filters.topic) params.set("topic", filters.topic);
    if (filters.subtopic) params.set("subtopic", filters.subtopic);
    if (filters.years.length === 1) params.set("year", String(filters.years[0]));
    router.push(`/test-interface?${params.toString()}`);
  };

  if (loadingStats) {
    return (
      <ProtectedRoute>
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-64 flex-shrink-0">
            <div className="bg-card shadow-surface rounded-xl p-5 h-80 animate-pulse" />
          </aside>
          <main className="flex-1">

          <div className="mb-8">
            <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">Previous Year Questions</h1>
            <p className="text-muted-foreground mt-2">Authentic UPSC PYQs with verified answers.</p>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-4 mb-8 no-scrollbar">
             {[2023, 2022, 2021, 2020, 2019, 2018, 2017].map(year => (
               <button 
                 key={year}
                 onClick={() => setFilters(prev => ({...prev, years: prev.years.includes(year) ? prev.years.filter(y => y !== year) : [year]}))}
                 className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all whitespace-nowrap border ${filters.years.includes(year) ? 'bg-primary text-primary-foreground border-primary shadow-surface-glow' : 'bg-card text-muted-foreground border-white/5 hover:bg-white/5 hover:text-foreground shadow-surface'}`}
               >
                 UPSC {year}
               </button>
             ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card shadow-surface rounded-xl p-6 h-64 animate-pulse" />
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
          <span className="text-6xl mb-6 opacity-80">🏛️</span>
          <h2 className="text-4xl font-display font-bold text-foreground mb-2">No PYQs yet</h2>
          <p className="text-muted-foreground mb-8 max-w-md">
            Upload a PDF with previous year questions and the AI will automatically extract and tag
            them with exam years.
          </p>
          <Link
            href="/"
            className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
          >
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
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="sticky top-24">
            <QuestionFilterPanel
              mode="pyq"
              filters={filters}
              onChange={setFilters}
              stats={stats}
              questionAttempts={questionAttempts}
            />
          </div>
        </aside>

        <main className="flex-1">

          <div className="mb-8">
            <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">Previous Year Questions</h1>
            <p className="text-muted-foreground mt-2">Authentic UPSC PYQs with verified answers.</p>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-4 mb-8 no-scrollbar">
             {[2023, 2022, 2021, 2020, 2019, 2018, 2017].map(year => (
               <button 
                 key={year}
                 onClick={() => setFilters(prev => ({...prev, years: prev.years.includes(year) ? prev.years.filter(y => y !== year) : [year]}))}
                 className={`px-5 py-2.5 rounded-full font-bold text-sm transition-all whitespace-nowrap border ${filters.years.includes(year) ? 'bg-primary text-primary-foreground border-primary shadow-surface-glow' : 'bg-card text-muted-foreground border-white/5 hover:bg-white/5 hover:text-foreground shadow-surface'}`}
               >
                 UPSC {year}
               </button>
             ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {visibleCards.map((card) => (
              <div
                key={card.id}
                className="bg-card shadow-surface rounded-xl p-6 flex flex-col hover:shadow-surface-hover transition-colors relative"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center ">
                    <Trophy className="w-5 h-5 text-amber-400" />
                  </div>
                  <span className="text-xs font-medium bg-amber-500/10 text-amber-300 px-3 py-1 rounded-full ">
                    {card.totalQs} PYQs
                  </span>
                </div>

                <h3 className="text-xl font-display font-bold text-foreground mb-2 leading-tight">{card.name}</h3>
                <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{card.desc}</p>

                <div className="mt-auto">
                  <div className="flex justify-between text-xs font-medium mb-2">
                    <span className="text-muted-foreground/70">Attempted</span>
                    <span className="text-foreground">
                      {card.attempted} / {card.totalQs} Qs
                      {card.accuracy > 0 && (
                        <span className="text-amber-400 ml-1">({Math.round(card.accuracy)}% acc)</span>
                      )}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-background rounded-full overflow-hidden mb-6 shadow-surface">
                    <div
                      className="h-full bg-amber-500"
                      style={{
                        width: card.totalQs > 0 ? `${(card.attempted / card.totalQs) * 100}%` : "0%",
                      }}
                    />
                  </div>

                  <button
                    onClick={() => setModalSubject(card.name)}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:scale-[0.98] active:scale-95 ease-snappy transition-all shadow-surface-glow transition-colors "
                  >
                    {card.attempted > 0 ? "Continue PYQs" : "Start PYQs"}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
