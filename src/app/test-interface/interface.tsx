"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Bookmark, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";

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
  year?: number | null;
  explanation?: string;
  subject?: string;
  subject_id?: string;
  topic?: string;
  why_a_wrong?: string;
  why_b_wrong?: string;
  why_c_wrong?: string;
  why_d_wrong?: string;
  elimination_tip?: string;
  static_topic_link?: string;
}

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
  const subtopic = searchParams.get("subtopic") || "";
  const difficulty = searchParams.get("difficulty") || "All Levels";
  const testId = searchParams.get("test_id") || "";
  const customCount = parseInt(searchParams.get("count") || "20");
  const customTime = parseInt(searchParams.get("time") || "3600");
  const dateParam = searchParams.get("date") || "";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionStatus, setQuestionStatus] = useState<Record<string, QuestionStatus>>({});
  const [timeLeft, setTimeLeft] = useState(7200);
  const [submitting, setSubmitting] = useState(false);
  const [testName, setTestName] = useState("UPSC Mock Test");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // New states for the additions
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Set<string>>(new Set());
  const [isVerifying, setIsVerifying] = useState(false);
  const [toastMessage, setToastMessage] = useState<{message: string, isLevelUp: boolean} | null>(null);
  const startTimeRef = useRef<number>(0);

  // Fetch bookmarks on load
  useEffect(() => {
    if (user) {
      const fetchBookmarks = async () => {
        try {
          const token = await user.getIdToken();
          const res = await fetch('/api/bookmarks', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setBookmarkedQuestions(new Set(data.bookmarks.map((b: Record<string, unknown>) => b.question_id)));
          }
        } catch (_e) {}
      };
      fetchBookmarks();
    }
  }, [user]);

  // Load questions
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        let data: Question[] | null = null;
        
        const token = await user?.getIdToken();
        const res = await fetch('/api/questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ mode, subject, topic, subtopic, difficulty, testId, customCount, date: dateParam })
        });
        
        if (res.ok) {
          const resData = await res.json();
          data = resData.questions;
        }

        if (mode === "practice" || mode === "test") {
          setTestName(subtopic ? `${subtopic} Practice` : topic ? `${topic} Practice` : `${subject} Practice`);
          setTimeLeft(3600);
        } else if (mode === "mock" && testId) {
          setTestName(`Mock Test #${testId}`);
          setTimeLeft(7200);
        } else if (mode === "custom") {
          setTestName("Custom Test");
          setTimeLeft(customTime);
        } else if (mode === "current-affairs") {
          setTestName(`Current Affairs ${dateParam}`);
          setTimeLeft(1800); // 30 minutes for daily CA test
        }

        const finalQuestions = data || [];
        setQuestions(finalQuestions);
        // Record start time once questions are loaded
        startTimeRef.current = Date.now();
        const initialStatus: Record<string, QuestionStatus> = {};
        finalQuestions.forEach(q => { initialStatus[q.id] = "not-visited"; });
        setQuestionStatus(initialStatus);
      } catch {
        setQuestions([]);
        setQuestionStatus({});
      }
      setLoading(false);
    };
    loadQuestions();
  }, [mode, subject, topic, subtopic, difficulty, testId, customCount, customTime, dateParam, user]);

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

  // Timer/Submit
  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current!);

    console.log('=== SUBMIT STARTED ===');
    console.log('Current user:', user?.uid);
    console.log('Questions count:', questions?.length);
    console.log('Answers state:', answers);

    try {
      // 1. Calculate scores
      let score = 0;
      let correctCount = 0;
      let wrongCount = 0;

      questions.forEach(q => {
        const ans = answers[q.id];
        if (ans) {
          const userAnsLower = ans.toLowerCase().trim();
          const correctAnsLower = q.correct_option?.toLowerCase().trim();
          if (userAnsLower === correctAnsLower) {
            score += 2;
            correctCount++;
          } else {
            score -= 0.66;
            wrongCount++;
          }
        }
      });
      score = Math.round(score * 100) / 100;
      const attemptedCount = correctCount + wrongCount;
      const unattempted = questions.length - attemptedCount;
      const totalMarks = questions.length * 2;
      const accuracy = attemptedCount > 0 ? Math.round((correctCount / attemptedCount) * 100) : 0;
      const timeTaken = startTimeRef.current > 0
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : (mode === 'mock' ? 7200 : 3600) - timeLeft;

      console.log('Scores:', { correctCount, wrongCount, unattempted, score, timeTaken });

      if (!user) {
        throw new Error('User not authenticated. Please log in again.');
      }

      // 2. Save via server route (uses service role key, bypasses schema cache + RLS)
      interface AnswerRow {
        question_id: string
        selected_option: string | null
        is_correct: boolean
        time_spent_seconds: number
        marked_for_review: boolean
      }

      const answerRows: AnswerRow[] = questions.map(q => {
        const userAnswer = answers[q.id]
        const correctAnswer = q.correct_option
        
        // Explicit boolean — never null
        let isCorrect = false
        if (userAnswer && correctAnswer) {
          isCorrect = userAnswer.toLowerCase().trim() === 
                      correctAnswer.toLowerCase().trim()
        }
        
        console.log(`Q ${q.id}: user="${userAnswer}" correct="${correctAnswer}" isCorrect=${isCorrect}`)
        
        return {
          question_id: q.id,
          selected_option: userAnswer || null,
          is_correct: isCorrect, // explicit true/false
          time_spent_seconds: 0,
          marked_for_review: questionStatus[q.id] === 'marked-for-review' || questionStatus[q.id] === 'answered-and-marked',
        }
      })

      const token = await user.getIdToken();
      const response = await fetch('/api/submit-test', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.uid,
          testId: testId || null,
          mode,
          score,
          totalMarks,
          correctCount,
          wrongCount,
          unattemptedCount: unattempted,
          accuracyPercent: accuracy,
          timeTakenSeconds: timeTaken,
          startedAt: new Date(Date.now() - timeTaken * 1000).toISOString(),
          answerRows,
        }),
      });

      const result = await response.json();
      console.log('submit-test response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Server error saving attempt');
      }

      const attemptId = result.attemptId;
      console.log('Attempt ID:', attemptId);

      // 4. Update user_statistics per subject (non-fatal)
      const subjectStats: Record<string, {correct: number, attempted: number}> = {};
      questions.forEach(q => {
        const subjectId = q.subject_id || q.subject || 'unknown';
        if (!subjectStats[subjectId]) subjectStats[subjectId] = { correct: 0, attempted: 0 };
        if (answers[q.id]) {
          subjectStats[subjectId].attempted++;
          const isCorrect = answers[q.id].toLowerCase().trim() === q.correct_option?.toLowerCase().trim();
          if (isCorrect) subjectStats[subjectId].correct++;
        }
      });

      for (const [subjId, stats] of Object.entries(subjectStats)) {
        try {
          const { error: rpcError } = await supabase.rpc('upsert_user_statistics', {
            p_user_id: user.uid,
            p_subject_id: subjId,
            p_attempted: stats.attempted,
            p_correct: stats.correct,
          });
          if (rpcError) console.error('Stats update error:', rpcError);
        } catch (e: unknown) {
          console.error('Stats update error:', e);
        }
      }

      // 5. Update XP/Streak (non-fatal)
      try {
        const res = await fetch("/api/update-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid, correctCount, attemptedCount, isMockTest: mode === "mock" })
        });
        const progressData = await res.json();
        if (progressData && !progressData.error) {
          setToastMessage({
            message: progressData.leveledUp
              ? `🎉 Level Up! You are now Level ${progressData.newLevel}`
              : `🔥 ${progressData.newStreak} day streak | +${progressData.xpEarned} XP earned`,
            isLevelUp: progressData.leveledUp
          });
          // Short delay so user sees toast, then redirect
          setTimeout(() => { router.push(`/results?attempt_id=${attemptId}`); }, 2500);
          return;
        }
      } catch (e: unknown) {
        console.error('Progress update failed (non-fatal):', e);
      }

      // ✅ Always redirect to results
      console.log('Redirecting to results:', attemptId);
      router.push(`/results?attempt_id=${attemptId}`);

    } catch (error: unknown) {
      console.error('=== SUBMIT FAILED ===', error);
      alert(
        'Test submission failed.\n\n' +
        'Error: ' + (error instanceof Error ? error.message : String(error)) +
        '\n\nPlease check the browser console (F12) and share the error with support.'
      );
      setSubmitting(false);
      // DO NOT redirect anywhere on error
    }
  }, [submitting, questions, answers, user, testId, mode, timeLeft, questionStatus, router]);

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

  const handleSelectOption = async (option: string) => {
    if (!currentQ || feedbackMode || isVerifying) return;
    
    const selectedLower = option.toLowerCase().trim();
    setAnswers(prev => ({ ...prev, [currentQ.id]: selectedLower }));
    
    if (mode === 'practice') {
      setIsVerifying(true);
      try {
        const token = await user?.getIdToken();
        const res = await fetch('/api/questions/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ question_id: currentQ.id, selected_option: selectedLower })
        });
        
        if (res.ok) {
          const data = await res.json();
          setQuestions(prev => prev.map(q => q.id === currentQ.id ? { ...q, ...data } : q));
        } else {
          console.error("Verification failed");
        }
      } catch (err) {
        console.error("Failed to verify question", err);
      } finally {
        setIsVerifying(false);
      }
    }
    
    setQuestionStatus(prev => {
      const cur = prev[currentQ.id];
      return { ...prev, [currentQ.id]: cur === "marked-for-review" ? "answered-and-marked" : "answered" };
    });
  };

  const handleMarkForReview = () => {
    if (!currentQ || feedbackMode) return;
    setQuestionStatus(prev => ({
      ...prev,
      [currentQ.id]: answers[currentQ.id] ? "answered-and-marked" : "marked-for-review",
    }));
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setFeedbackMode(false);
    }
  };

  const handleClearResponse = () => {
    if (!currentQ || feedbackMode) return;
    setAnswers(prev => { const n = { ...prev }; delete n[currentQ.id]; return n; });
    setQuestionStatus(prev => ({ ...prev, [currentQ.id]: "unanswered" }));
  };

  const handleSaveAndNext = () => {
    if (!currentQ) return;
    if (answers[currentQ.id]) setQuestionStatus(prev => ({ ...prev, [currentQ.id]: "answered" }));
    
    if (mode === "practice" && !feedbackMode && answers[currentQ.id]) {
      // Trigger feedback panel instead of moving
      setFeedbackMode(true);
      return;
    }

    // Normal move to next
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setFeedbackMode(false);
    }
  };

  const handleBookmarkToggle = async () => {
    if (!currentQ || !user) return;
    const isBookmarked = bookmarkedQuestions.has(currentQ.id);

    // Optimistic UI update
    setBookmarkedQuestions(prev => {
      const next = new Set(prev);
      if (isBookmarked) next.delete(currentQ.id);
      else next.add(currentQ.id);
      return next;
    });

    try {
      const token = await user.getIdToken();
      await fetch('/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          question_id: currentQ.id, 
          action: isBookmarked ? 'remove' : 'add' 
        })
      });
    } catch (_e) {
      // Revert on error
      setBookmarkedQuestions(prev => {
        const next = new Set(prev);
        if (isBookmarked) next.add(currentQ.id);
        else next.delete(currentQ.id);
        return next;
      });
    }
  };

  const handleConfidenceSelect = async (level: "easy" | "got_it" | "tricky") => {
    if (!currentQ || !user) return;

    const isCorrect = answers[currentQ.id]?.toLowerCase().trim() === currentQ.correct_option?.toLowerCase().trim();
    
    if (level !== "easy") {
      const isTricky = level === "tricky" || !isCorrect;
      const interval = isTricky ? 1 : 3;
      
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + interval);
      const nextReviewStr = nextReview.toISOString().split("T")[0];

      const token = await user?.getIdToken();
      await fetch('/api/revision-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          action: 'upsert',
          question_id: currentQ.id,
          interval_days: interval,
          next_review_date: nextReviewStr
        })
      });
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setFeedbackMode(false);
    }
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

  const isCorrect = currentQ ? answers[currentQ.id]?.toLowerCase().trim() === currentQ.correct_option?.toLowerCase().trim() : false;

  return (
    <div className="h-screen bg-[#121212] flex flex-col overflow-hidden relative">
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
              <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6 flex-shrink-0 relative">
                <button 
                  onClick={handleBookmarkToggle}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 transition-colors"
                >
                  <Bookmark className={`w-5 h-5 ${bookmarkedQuestions.has(currentQ.id) ? "fill-primary text-primary" : "text-gray-400"}`} />
                </button>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {currentQ.year && (
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      UPSC {currentQ.year}
                    </span>
                  )}
                  {mode === 'current-affairs' && (
                    <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Current Affairs
                    </span>
                  )}
                </div>
                <p className="text-white text-lg leading-relaxed pr-8">{currentQ.question_text}</p>
              </div>

              {/* Options */}
              <div className="flex flex-col gap-3 flex-shrink-0">
                {(["A", "B", "C", "D"] as const).map(opt => {
                  const text = currentQ[`option_${opt.toLowerCase()}` as keyof Question] as string;
                  const isSelected = answers[currentQ.id]?.toLowerCase() === opt.toLowerCase();
                  const showAsCorrect = feedbackMode && opt === currentQ.correct_option;
                  const showAsWrong = feedbackMode && isSelected && !isCorrect;

                  let btnStyle = isSelected
                    ? "bg-primary/10 border-primary shadow-[0_0_20px_rgba(255,191,0,0.08)] text-white"
                    : "bg-[#1a1a1a] border-white/5 text-gray-300 hover:border-white/20 hover:text-white";
                  
                  if (feedbackMode) {
                    if (showAsCorrect) btnStyle = "bg-green-500/20 border-green-500 text-white";
                    else if (showAsWrong) btnStyle = "bg-red-500/20 border-red-500 text-white";
                    else btnStyle = "bg-[#1a1a1a] border-white/5 text-gray-500 opacity-70";
                  }

                  return (
                    <button
                      key={opt}
                      disabled={feedbackMode || isVerifying}
                      onClick={() => handleSelectOption(opt)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-4 ${btnStyle} ${isVerifying ? 'opacity-70 cursor-wait' : ''}`}
                    >
                      <span className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm transition-colors ${
                        showAsCorrect ? "bg-green-500 border-green-500 text-white" :
                        showAsWrong ? "bg-red-500 border-red-500 text-white" :
                        isSelected ? "bg-primary border-primary text-primary-foreground" : "border-white/20 text-gray-400"
                      }`}>
                        {isVerifying && isSelected ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : opt}
                      </span>
                      <span className="mt-1 text-sm leading-relaxed">{text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Feedback Panels */}
              {mode === 'practice' && feedbackMode && (
                <div className="flex flex-col gap-4 mt-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
                  {/* Panel 1: Result */}
                  <div className={`p-4 rounded-xl border ${isCorrect ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                    <div className={`flex items-center gap-2 font-bold mb-2 ${isCorrect ? "text-green-400" : "text-red-400"}`}>
                      {isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      {isCorrect ? "Correct!" : `Incorrect. The correct answer was ${currentQ.correct_option}`}
                    </div>
                    {currentQ.explanation && (
                      <p className="text-gray-300 text-sm leading-relaxed">{currentQ.explanation}</p>
                    )}
                  </div>

                  {/* Panel 2: Why Wrong Options Fail */}
                  {(currentQ.why_a_wrong || currentQ.why_b_wrong || currentQ.why_c_wrong || currentQ.why_d_wrong) && (
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-white mb-3">Why the incorrect options fail</h4>
                      <div className="space-y-3">
                        {['A','B','C','D'].map(opt => {
                          const wrongReason = currentQ[`why_${opt.toLowerCase()}_wrong` as keyof Question] as string;
                          if (opt !== currentQ.correct_option && wrongReason) {
                            return (
                              <div key={opt} className="text-sm">
                                <span className="font-bold text-gray-400">Option {opt}:</span> <span className="text-gray-300">{wrongReason}</span>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Panel 3: Elimination Tip */}
                  {currentQ.elimination_tip && (
                    <div className="bg-[#1a1a1a] border border-amber-500/30 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-amber-500 mb-2 flex items-center gap-2">🎯 Elimination Tip</h4>
                      <p className="text-sm text-gray-300">{currentQ.elimination_tip}</p>
                    </div>
                  )}

                  {/* Panel 4: Static Connection */}
                  {currentQ.static_topic_link && (
                    <div className="bg-[#1a1a1a] border border-blue-500/30 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">🔗 Static Syllabus Connection</h4>
                      <p className="text-sm text-gray-300 mb-3">{currentQ.static_topic_link}</p>
                      <button onClick={() => window.open(`/practice-tests?topic=${encodeURIComponent(currentQ.topic || "")}`, '_blank')} className="text-xs bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-md hover:bg-blue-500/30 transition-colors">
                        Practice more from this topic →
                      </button>
                    </div>
                  )}

                  {/* Confidence Selector */}
                  <div className="bg-white/5 border border-white/10 p-4 rounded-xl mt-2 text-center">
                    <p className="text-sm text-gray-400 mb-3">How well did you know this?</p>
                    <div className="flex justify-center gap-3">
                      <button onClick={() => handleConfidenceSelect("easy")} className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-sm font-medium hover:bg-green-500/30">Easy ✓</button>
                      <button onClick={() => handleConfidenceSelect("got_it")} className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm font-medium hover:bg-blue-500/30">Got it ~</button>
                      <button onClick={() => handleConfidenceSelect("tricky")} className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/30">Tricky ✗</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 items-center justify-between flex-shrink-0 pt-4 pb-10">
                {!(mode === 'practice' && feedbackMode) ? (
                  <>
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
                      {currentIndex < questions.length - 1 ? (
                        <button onClick={handleSaveAndNext} className="flex items-center gap-1 px-6 py-2 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                          {mode === 'practice' && answers[currentQ.id] ? 'Check Answer' : 'Save & Next'} <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button onClick={handleSubmit} className="flex items-center gap-1 px-6 py-2 rounded-lg text-sm font-bold bg-green-600 text-white hover:bg-green-700 transition-colors">
                          Submit Test <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="w-full flex justify-end">
                    {currentIndex < questions.length - 1 ? (
                      <button onClick={() => { setCurrentIndex(i => i + 1); setFeedbackMode(false); }} className="flex items-center gap-1 px-8 py-3 rounded-lg text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors w-full md:w-auto justify-center">
                        Next Question <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={handleSubmit} className="flex items-center gap-1 px-8 py-3 rounded-lg text-sm font-bold bg-green-600 text-white hover:bg-green-700 transition-colors w-full md:w-auto justify-center">
                        Submit Test <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
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
                  onClick={() => { setCurrentIndex(i); setFeedbackMode(false); }}
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

      {/* Custom Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in ${
          toastMessage.isLevelUp ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-400" : "bg-[#1a1a1a] text-amber-500 border-white/10"
        }`}>
          {toastMessage.isLevelUp && <span className="text-2xl">🎉</span>}
          <span className="font-bold text-sm">{toastMessage.message}</span>
        </div>
      )}
    </div>
  );
}
