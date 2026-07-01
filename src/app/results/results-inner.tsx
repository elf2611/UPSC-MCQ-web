"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";
import {
  CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronUp,
  ArrowRight, Clock, Target, RotateCcw, Bookmark
} from "lucide-react";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────
interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation?: string;
  subject?: string;
  topic?: string;
}

interface AttemptAnswer {
  question_id: string;
  selected_option: string | null;
  is_correct: boolean;
  is_marked?: boolean;
  questions?: Question;
}

interface AttemptData {
  id: string;
  score: number;
  total_questions: number;
  attempted: number;
  time_taken: number;
  mode: string;
}

// ── Fallback demo data ─────────────────────────────────────────────────────
const DEMO_ATTEMPT: AttemptData = {
  id: "demo", score: 103.5, total_questions: 100,
  attempted: 85, time_taken: 5820, mode: "mock",
};

const DEMO_ANSWERS: AttemptAnswer[] = [
  { question_id: "q1", selected_option: "C", is_correct: true, questions: { id: "q1", question_text: "Which feature of the Indian Constitution is borrowed from the British Constitution?", option_a: "Rule of Law", option_b: "Fundamental Rights", option_c: "Parliamentary Form of Government", option_d: "Directive Principles of State Policy", correct_option: "C", explanation: "The Parliamentary Form of Government is borrowed from the UK. Fundamental Rights come from the US Constitution, and DPSP from Ireland.", subject: "Polity", topic: "Constitutional Framework" } },
  { question_id: "q2", selected_option: "A", is_correct: false, questions: { id: "q2", question_text: "The concept of 'Preamble' was borrowed from which Constitution?", option_a: "United Kingdom", option_b: "United States of America", option_c: "Canada", option_d: "Australia", correct_option: "B", explanation: "The concept of Preamble was borrowed from the US Constitution.", subject: "Polity", topic: "Preamble" } },
  { question_id: "q3", selected_option: null, is_correct: false, questions: { id: "q3", question_text: "Which of the following is NOT a Fundamental Right?", option_a: "Right to Equality", option_b: "Right to Property", option_c: "Right to Freedom of Religion", option_d: "Right against Exploitation", correct_option: "B", explanation: "Right to Property was removed by the 44th Amendment Act, 1978.", subject: "Polity", topic: "Fundamental Rights" } },
  { question_id: "q4", selected_option: "A", is_correct: true, questions: { id: "q4", question_text: "The 'Battle of Plassey' was fought in which year?", option_a: "1757", option_b: "1764", option_c: "1776", option_d: "1801", correct_option: "A", explanation: "The Battle of Plassey was fought on June 23, 1757.", subject: "History", topic: "British Conquest" } },
  { question_id: "q5", selected_option: "C", is_correct: false, questions: { id: "q5", question_text: "Which river is known as the 'Sorrow of Bihar'?", option_a: "Ganga", option_b: "Kosi", option_c: "Son", option_d: "Gandak", correct_option: "B", explanation: "The Kosi river frequently changes course and causes devastating floods.", subject: "Geography", topic: "Rivers of India" } },
];

const SUBJECT_DATA = [
  { subject: "Polity", correct: 14, incorrect: 3, skipped: 3, accuracy: 82 },
  { subject: "History", correct: 9, incorrect: 6, skipped: 0, accuracy: 60 },
  { subject: "Geography", correct: 11, incorrect: 4, skipped: 0, accuracy: 73 },
  { subject: "Economy", correct: 7, incorrect: 6, skipped: 2, accuracy: 54 },
  { subject: "Environment", correct: 6, incorrect: 7, skipped: 2, accuracy: 46 },
  { subject: "Sci & Tech", correct: 5, incorrect: 4, skipped: 1, accuracy: 56 },
  { subject: "Curr. Affairs", correct: 8, incorrect: 6, skipped: 1, accuracy: 57 },
];

type FilterType = "all" | "correct" | "incorrect" | "unattempted" | "marked";

// ── Circular Progress Ring ─────────────────────────────────────────────────
function CircleRing({ pct, size = 120, stroke = 10, color = "#ffbf00" }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2a2a2a" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function ResultsInner() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const attemptId = searchParams.get("attempt_id");

  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [answers, setAnswers] = useState<AttemptAnswer[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (attemptId && user) {
        const { data: a } = await supabase.from("test_attempts").select("*").eq("id", attemptId).single();
        if (a) {
          setAttempt(a);
          const { data: ans } = await supabase.from("attempt_answers").select("*, questions(*)").eq("attempt_id", attemptId);
          if (ans) { setAnswers(ans); setLoading(false); return; }
        }
      }
      // Fallback session + demo
      const stored = sessionStorage.getItem("last_score");
      if (stored) {
        const p = JSON.parse(stored);
        setAttempt({ id: "local", score: p.score, total_questions: p.total, attempted: p.attempted, time_taken: 0, mode: "practice" });
      } else {
        setAttempt(DEMO_ATTEMPT);
      }
      setAnswers(DEMO_ANSWERS);
      setLoading(false);
    };
    load();
  }, [attemptId, user]);

  const d = attempt || DEMO_ATTEMPT;
  const correct = answers.filter(a => a.is_correct).length;
  const incorrect = answers.filter(a => !a.is_correct && a.selected_option).length;
  const unattempted = answers.filter(a => !a.selected_option).length;
  const marked = answers.filter(a => a.is_marked).length;
  const accuracy = d.attempted > 0 ? Math.round((correct / d.attempted) * 100) : 0;
  const mins = Math.floor(d.time_taken / 60);
  const secs = d.time_taken % 60;

  const filteredAnswers = answers.filter(a => {
    if (filter === "correct") return a.is_correct;
    if (filter === "incorrect") return !a.is_correct && a.selected_option;
    if (filter === "unattempted") return !a.selected_option;
    if (filter === "marked") return a.is_marked;
    return true;
  });

  const FILTER_CHIPS: { key: FilterType; label: string; count: number; color: string }[] = [
    { key: "all", label: "All", count: answers.length, color: "bg-white/10 text-white border-white/20" },
    { key: "correct", label: "Correct", count: correct, color: "bg-green-500/10 text-green-400 border-green-500/20" },
    { key: "incorrect", label: "Incorrect", count: incorrect, color: "bg-red-500/10 text-red-400 border-red-500/20" },
    { key: "unattempted", label: "Unattempted", count: unattempted, color: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
    { key: "marked", label: "Marked", count: marked, color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212]">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Test Analysis</h1>
            <p className="text-gray-400 mt-1">Detailed breakdown of your performance.</p>
          </div>
          <Link href="/mock-tests" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-white/10 px-4 py-2 rounded-lg hover:bg-white/5 transition-colors">
            Back to Tests <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* ── Score Card ─────────────────────────────────────────────────────── */}
        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 lg:p-8 mb-8">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Ring */}
            <div className="relative flex-shrink-0">
              <CircleRing pct={accuracy} size={140} stroke={12} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-primary">{accuracy}%</span>
                <span className="text-xs text-gray-500">Accuracy</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
              <div className="text-center p-4 bg-background rounded-xl border border-white/5">
                <p className="text-xs text-gray-500 mb-1">Total Score</p>
                <p className="text-3xl font-extrabold text-primary">{d.score.toFixed(1)}</p>
                <p className="text-xs text-gray-600">/ {d.total_questions * 2}</p>
              </div>
              <div className="text-center p-4 bg-background rounded-xl border border-white/5">
                <p className="text-xs text-gray-500 mb-1">Correct</p>
                <p className="text-3xl font-extrabold text-green-400">{correct}</p>
                <p className="text-xs text-gray-600">+{correct * 2} marks</p>
              </div>
              <div className="text-center p-4 bg-background rounded-xl border border-white/5">
                <p className="text-xs text-gray-500 mb-1">Incorrect</p>
                <p className="text-3xl font-extrabold text-red-400">{incorrect}</p>
                <p className="text-xs text-gray-600">−{(incorrect * 0.66).toFixed(2)} marks</p>
              </div>
              <div className="text-center p-4 bg-background rounded-xl border border-white/5">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  <p className="text-xs text-gray-500">Time Taken</p>
                </div>
                <p className="text-3xl font-extrabold text-white">{mins}<span className="text-lg">m</span></p>
                <p className="text-xs text-gray-600">{secs}s remaining</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Subject-wise Bar Chart ─────────────────────────────────────────── */}
        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 mb-8">
          <h3 className="text-white font-semibold mb-6">Subject-wise Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SUBJECT_DATA} barSize={10} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2a2a" />
                <XAxis dataKey="subject" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", borderColor: "#374151", color: "#fff", borderRadius: "8px" }} />
                <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
                <Bar dataKey="correct" fill="#10b981" name="Correct" radius={[4, 4, 0, 0]} />
                <Bar dataKey="incorrect" fill="#ef4444" name="Incorrect" radius={[4, 4, 0, 0]} />
                <Bar dataKey="skipped" fill="#374151" name="Skipped" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Accuracy progress bars */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SUBJECT_DATA.map(s => (
              <div key={s.subject}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-400 font-medium">{s.subject}</span>
                  <span className={s.accuracy >= 70 ? "text-green-400" : s.accuracy >= 50 ? "text-amber-400" : "text-red-400"}>{s.accuracy}%</span>
                </div>
                <div className="h-1.5 bg-background rounded-full overflow-hidden border border-white/5">
                  <div className={`h-full rounded-full transition-all duration-700 ${s.accuracy >= 70 ? "bg-green-500" : s.accuracy >= 50 ? "bg-amber-400" : "bg-red-500"}`} style={{ width: `${s.accuracy}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Question Review ────────────────────────────────────────────────── */}
        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <h3 className="text-white font-semibold">Question Review</h3>
            <div className="flex flex-wrap gap-2">
              {FILTER_CHIPS.map(chip => (
                <button
                  key={chip.key}
                  onClick={() => setFilter(chip.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filter === chip.key ? chip.color + " ring-2 ring-offset-1 ring-offset-[#1a1a1a] ring-current" : "bg-white/5 text-gray-500 border-white/10 hover:border-white/20"}`}
                >
                  {chip.label} <span className="ml-1 opacity-70">({chip.count})</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredAnswers.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No questions match this filter.</p>
            ) : filteredAnswers.map((ans, i) => {
              const q = ans.questions;
              if (!q) return null;
              const isExpanded = expandedId === ans.question_id;
              const isCorrect = ans.is_correct;
              const isSkipped = !ans.selected_option;

              return (
                <div key={ans.question_id} className="border border-white/5 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : ans.question_id)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {isCorrect ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                        : isSkipped ? <MinusCircle className="w-5 h-5 text-gray-500" />
                          : <XCircle className="w-5 h-5 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 line-clamp-1">Q{i + 1}. {q.question_text}</p>
                      {q.subject && <span className="text-xs text-gray-600">{q.subject}{q.topic ? ` · ${q.topic}` : ""}</span>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {!isSkipped && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${isCorrect ? "text-green-400 bg-green-500/10" : "text-red-400 bg-red-500/10"}`}>
                          {isCorrect ? "+2" : "-0.66"}
                        </span>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 border-t border-white/5">
                      <p className="text-gray-300 mb-5 text-sm leading-relaxed">{q.question_text}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                        {(["A", "B", "C", "D"] as const).map(opt => {
                          const text = q[`option_${opt.toLowerCase()}` as keyof Question] as string;
                          const isCorrectOpt = opt === q.correct_option;
                          const isUserOpt = opt === ans.selected_option;
                          return (
                            <div key={opt} className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${isCorrectOpt ? "bg-green-500/10 border-green-500/30 text-green-300" : isUserOpt && !isCorrectOpt ? "bg-red-500/10 border-red-500/30 text-red-300" : "bg-background border-white/5 text-gray-500"}`}>
                              <span className="font-bold flex-shrink-0">{opt}.</span>
                              <span className="leading-relaxed">{text}</span>
                              {isCorrectOpt && <CheckCircle2 className="w-4 h-4 flex-shrink-0 ml-auto" />}
                              {isUserOpt && !isCorrectOpt && <XCircle className="w-4 h-4 flex-shrink-0 ml-auto" />}
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Explanation</p>
                          <p className="text-gray-300 text-sm leading-relaxed">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Bottom CTAs ────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-4 justify-end">
          <Link href="/practice-tests" className="flex items-center gap-2 px-6 py-3 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition-colors font-medium">
            <RotateCcw className="w-4 h-4" /> Retake Similar Test
          </Link>
          <Link href="/mock-tests" className="flex items-center gap-2 px-6 py-3 border border-white/10 text-gray-300 rounded-lg hover:bg-white/5 transition-colors font-medium">
            Back to Mock Tests
          </Link>
          <Link href="/performance" className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 shadow-[0_0_15px_rgba(255,191,0,0.2)] transition-colors">
            View Performance <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </ProtectedRoute>
  );
}
