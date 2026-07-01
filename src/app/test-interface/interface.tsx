"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Bookmark, ChevronLeft, ChevronRight, AlertCircle } from "lucide-react";

// --- Types ---
type QuestionStatus = "not-visited" | "unanswered" | "answered" | "marked-for-review" | "answered-and-marked";

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
}

// --- Fallback questions ---
const FALLBACK_QUESTIONS: Question[] = [
  { id: "q1", question_text: "Which among the following features of the Indian Constitution is borrowed from the British Constitution?", option_a: "Rule of Law", option_b: "Fundamental Rights", option_c: "Parliamentary Form of Government", option_d: "Directive Principles of State Policy", correct_option: "C", explanation: "The Parliamentary form of Government (Cabinet form of Government) is borrowed from the British Constitution.", subject: "Polity" },
  { id: "q2", question_text: "The concept of 'Preamble' in the Indian Constitution was borrowed from:", option_a: "United Kingdom", option_b: "United States of America", option_c: "Canada", option_d: "Australia", correct_option: "B", explanation: "The concept of Preamble was borrowed from the US Constitution.", subject: "Polity" },
  { id: "q3", question_text: "Which of the following is not a Fundamental Right under the Indian Constitution?", option_a: "Right to Equality", option_b: "Right to Property", option_c: "Right to Freedom of Religion", option_d: "Right against Exploitation", correct_option: "B", explanation: "Right to Property was removed by the 44th Amendment Act, 1978.", subject: "Polity" },
  { id: "q4", question_text: "The 'Battle of Plassey' was fought in which year?", option_a: "1757", option_b: "1764", option_c: "1776", option_d: "1801", correct_option: "A", explanation: "The Battle of Plassey was fought on June 23, 1757.", subject: "History" },
  { id: "q5", question_text: "Which river is known as the 'Sorrow of Bihar'?", option_a: "Ganga", option_b: "Kosi", option_c: "Son", option_d: "Gandak", correct_option: "B", explanation: "The Kosi river frequently changes its course and causes devastating floods in Bihar.", subject: "Geography" },
  { id: "q6", question_text: "The 'Doctrine of Lapse' was introduced by which Governor-General?", option_a: "Lord Cornwallis", option_b: "Lord Dalhousie", option_c: "Lord Wellesley", option_d: "Lord Bentinck", correct_option: "B", explanation: "Lord Dalhousie introduced the Doctrine of Lapse.", subject: "History" },
  { id: "q7", question_text: "Which Article of the Indian Constitution abolishes untouchability?", option_a: "Article 14", option_b: "Article 15", option_c: "Article 16", option_d: "Article 17", correct_option: "D", explanation: "Article 17 abolishes untouchability and forbids its practice in any form.", subject: "Polity" },
  { id: "q8", question_text: "The Western Ghats are also known as:", option_a: "Sahyadri", option_b: "Vindyas", option_c: "Aravalli", option_d: "Satpura", correct_option: "A", explanation: "The Western Ghats are also known as the Sahyadri mountain range.", subject: "Geography" },
];

// --- Status Config ---
const STATUS_CONFIG: Record<QuestionStatus, { bg: string; border: string; label: string }> = {
  "not-visited": { bg: "bg-background", border: "border-white/20", label: "Not Visited" },
  "unanswered": { bg: "bg-red-500/20", border: "border-red-500/50", label: "Not Answered" },
  "answered": { bg: "bg-green-500/20", border: "border-green-500/50", label: "Answered" },
  "marked-for-review": { bg: "bg-purple-500/20", border: "border-purple-500/50", label: "Marked for Review" },
  "answered-and-marked": { bg: "bg-amber-500/20", border: "border-amber-500/50", label: "Answered & Marked" },
};

function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
}

export default function TestInterfaceInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const mode = searchParams.get("mode") || "practice";
  const subject = searchParams.get("subject") || "";
  const topic = searchParams.get("topic") || "";
  const difficulty = searchParams.get("difficulty") || "All Levels";
  const testId = searchParams.get("test_id") || "";
  const customCount = parseInt(searchParams.get("count") || "50");
  const customTime = parseInt(searchParams.get("time") || "3600");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionStatus, setQuestionStatus] = useState<Record<string, QuestionStatus>>({});
  const [timeLeft, setTimeLeft] = useState(7200);
  const [submitting, setSubmitting] = useState(false);
  const [testName, setTestName] = useState("UPSC Mock Test");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load questions
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        let data: Question[] | null = null;
        let query = supabase.from("questions").select("*");

        if (mode === "practice") {
          if (subject) query = query.eq("subject", subject);
          if (topic) query = query.eq("topic", topic);
          if (difficulty && difficulty !== "All Levels") query = query.eq("difficulty", difficulty);
          query = query.limit(50);
          setTestName(topic ? `${topic} Practice` : `${subject} Practice`);
          setTimeLeft(3600);
        } else if (mode === "mock" && testId) {
          query = query.limit(100);
          setTestName(`Mock Test #${testId}`);
          setTimeLeft(7200);
        } else if (mode === "custom") {
          query = query.limit(customCount);
          setTestName("Custom Test");
          setTimeLeft(customTime);
        }

        const { data: fetchedData, error } = await query;
        if (!error && fetchedData && fetchedData.length > 0) {
          data = fetchedData;
        }

        const finalQuestions = data || FALLBACK_QUESTIONS.slice(0, mode === "custom" ? Math.min(customCount, FALLBACK_QUESTIONS.length) : FALLBACK_QUESTIONS.length);
        setQuestions(finalQuestions);
        const initialStatus: Record<string, QuestionStatus> = {};
        finalQuestions.forEach(q => { initialStatus[q.id] = "not-visited"; });
        setQuestionStatus(initialStatus);
      } catch {
        setQuestions(FALLBACK_QUESTIONS);
        const initialStatus: Record<string, QuestionStatus> = {};
        FALLBACK_QUESTIONS.forEach(q => { initialStatus[q.id] = "not-visited"; });
        setQuestionStatus(initialStatus);
      }
      setLoading(false);
    };
    loadQuestions();
  }, [mode, subject, topic, difficulty, testId, customCount, customTime]);

  // Mark question as visited on navigate
  useEffect(() => {
    if (!questions.length) return;
    const qId = questions[currentIndex]?.id;
    if (!qId) return;
    setQuestionStatus(prev => ({
      ...prev,
      [qId]: prev[qId] === "not-visited" ? "unanswered" : prev[qId],
    }));
  }, [currentIndex, questions]);

  // Timer
  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current!);

    let score = 0;
    questions.forEach(q => {
      const ans = answers[q.id];
      if (ans) {
        if (ans === q.correct_option) score += 2;
        else score -= 0.66;
      }
    });
    score = Math.round(score * 100) / 100;

    try {
      if (user) {
        const { data: attemptData, error } = await supabase
          .from("test_attempts")
          .insert({
            user_id: user.uid,
            test_id: testId || null,
            mode,
            score,
            total_questions: questions.length,
            attempted: Object.keys(answers).length,
            time_taken: timeLeft,
          })
          .select()
          .single();

        if (!error && attemptData) {
          const rows = Object.entries(answers).map(([qId, opt]) => ({
            attempt_id: attemptData.id,
            question_id: qId,
            selected_option: opt,
            is_correct: opt === questions.find(q => q.id === qId)?.correct_option,
          }));
          await supabase.from("attempt_answers").insert(rows);
          router.push(`/results?attempt_id=${attemptData.id}`);
          return;
        }
      }
    } catch (err) {
      console.error(err);
    }

    sessionStorage.setItem("last_score", JSON.stringify({ score, total: questions.length, attempted: Object.keys(answers).length }));
    router.push("/results");
  }, [submitting, questions, answers, user, testId, mode, timeLeft, router]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [handleSubmit]);

  const currentQ = questions[currentIndex];

  const handleSelectOption = (option: string) => {
    if (!currentQ) return;
    setAnswers(prev => ({ ...prev, [currentQ.id]: option }));
    setQuestionStatus(prev => {
      const cur = prev[currentQ.id];
      return { ...prev, [currentQ.id]: cur === "marked-for-review" ? "answered-and-marked" : "answered" };
    });
  };

  const handleMarkForReview = () => {
    if (!currentQ) return;
    setQuestionStatus(prev => ({
      ...prev,
      [currentQ.id]: answers[currentQ.id] ? "answered-and-marked" : "marked-for-review",
    }));
    if (currentIndex < questions.length - 1) setCurrentIndex(i => i + 1);
  };

  const handleClearResponse = () => {
    if (!currentQ) return;
    setAnswers(prev => { const n = { ...prev }; delete n[currentQ.id]; return n; });
    setQuestionStatus(prev => ({ ...prev, [currentQ.id]: "unanswered" }));
  };

  const handleSaveAndNext = () => {
    if (!currentQ) return;
    if (answers[currentQ.id]) setQuestionStatus(prev => ({ ...prev, [currentQ.id]: "answered" }));
    if (currentIndex < questions.length - 1) setCurrentIndex(i => i + 1);
  };

  const timerIsLow = timeLeft < 300;

  const answered = Object.values(questionStatus).filter(s => s === "answered" || s === "answered-and-marked").length;
  const markedReview = Object.values(questionStatus).filter(s => s === "marked-for-review" || s === "answered-and-marked").length;
  const unanswered = Object.values(questionStatus).filter(s => s === "unanswered").length;
  const notVisited = Object.values(questionStatus).filter(s => s === "not-visited").length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#121212] flex flex-col overflow-hidden">
      {/* Top Bar */}
      <header className="bg-[#1a1a1a] border-b border-white/5 px-4 lg:px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0 z-40">
        <h1 className="font-semibold text-white text-sm lg:text-base truncate max-w-xs lg:max-w-sm">{testName}</h1>
        <div className={`font-mono text-xl lg:text-2xl font-bold tracking-widest tabular-nums transition-colors ${timerIsLow ? "text-red-400 animate-pulse" : "text-primary"}`}>
          {formatTime(timeLeft)}
        </div>
        <button
          onClick={() => { if (confirm("Submit test? This action cannot be undone.")) handleSubmit(); }}
          disabled={submitting}
          className="bg-primary text-primary-foreground px-4 lg:px-6 py-2 rounded-lg font-bold text-sm hover:bg-primary/90 disabled:opacity-70 transition-colors whitespace-nowrap"
        >
          {submitting ? "Submitting…" : "Submit Test"}
        </button>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Main Question Area */}
        <main className="flex-1 flex flex-col overflow-y-auto p-4 lg:p-6 gap-4">

          {/* Meta row */}
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Question <span className="font-bold text-white">{currentIndex + 1}</span> of <span className="font-bold text-white">{questions.length}</span></span>
              {currentQ?.subject && <span className="text-xs bg-white/5 border border-white/10 text-gray-400 px-2.5 py-0.5 rounded-full">{currentQ.subject}</span>}
            </div>
            <span className="text-xs text-gray-600 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">+2 / −0.66</span>
          </div>

          {/* Question */}
          {currentQ ? (
            <>
              <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6 flex-shrink-0">
                <p className="text-white text-lg leading-relaxed">{currentQ.question_text}</p>
              </div>

              {/* Options */}
              <div className="flex flex-col gap-3 flex-shrink-0">
                {(["A", "B", "C", "D"] as const).map(opt => {
                  const text = currentQ[`option_${opt.toLowerCase()}` as keyof Question] as string;
                  const isSelected = answers[currentQ.id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => handleSelectOption(opt)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-4 ${
                        isSelected
                          ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(255,191,0,0.08)] text-white"
                          : "bg-[#1a1a1a] border-white/5 text-gray-300 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      <span className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm transition-colors ${isSelected ? "bg-primary border-primary text-primary-foreground" : "border-white/20 text-gray-400"}`}>
                        {opt}
                      </span>
                      <span className="mt-1 text-sm leading-relaxed">{text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 items-center justify-between flex-shrink-0 pt-2">
                <div className="flex gap-2 flex-wrap">
                  <button onClick={handleMarkForReview} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors">
                    <Bookmark className="w-4 h-4" /> Mark for Review
                  </button>
                  <button onClick={handleClearResponse} className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white transition-colors">
                    Clear Response
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentIndex(i => Math.max(0, i - 1))} disabled={currentIndex === 0} className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 hover:text-white disabled:opacity-40 transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  <button onClick={handleSaveAndNext} className="flex items-center gap-1 px-6 py-2 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                    Save & Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center flex-1 text-gray-500">
              <AlertCircle className="w-5 h-5 mr-2" /> No questions found.
            </div>
          )}
        </main>

        {/* Right Sidebar — Question Palette */}
        <aside className="hidden lg:flex w-64 xl:w-72 flex-col bg-[#1a1a1a] border-l border-white/5 p-4 flex-shrink-0 overflow-y-auto">
          <h3 className="text-sm font-semibold text-white mb-4 flex-shrink-0">Question Palette</h3>

          {/* Legend */}
          <div className="grid grid-cols-1 gap-y-1.5 mb-5 text-xs text-gray-500 flex-shrink-0">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border flex-shrink-0 ${cfg.bg} ${cfg.border}`} />
                <span>{cfg.label}</span>
              </div>
            ))}
          </div>

          {/* Grid of Question Buttons */}
          <div className="grid grid-cols-5 gap-1.5 content-start flex-1">
            {questions.map((q, i) => {
              const status = questionStatus[q.id] || "not-visited";
              const cfg = STATUS_CONFIG[status];
              const isCurrent = i === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`aspect-square rounded-md text-xs font-bold border transition-all ${cfg.bg} ${cfg.border} ${isCurrent ? "ring-2 ring-primary ring-offset-1 ring-offset-[#1a1a1a] text-white scale-110" : "text-gray-300 hover:scale-105"}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Live Summary */}
          <div className="mt-4 pt-4 border-t border-white/5 space-y-2 text-xs text-gray-500 flex-shrink-0">
            <div className="flex justify-between"><span>Answered</span><span className="text-green-400 font-bold">{answered}</span></div>
            <div className="flex justify-between"><span>Not Answered</span><span className="text-red-400 font-bold">{unanswered}</span></div>
            <div className="flex justify-between"><span>Marked for Review</span><span className="text-purple-400 font-bold">{markedReview}</span></div>
            <div className="flex justify-between"><span>Not Visited</span><span className="text-gray-400 font-bold">{notVisited}</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
