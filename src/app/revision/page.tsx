"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, XCircle, Activity, Calendar as CalIcon } from "lucide-react";
import Link from "next/link";
import { ActivityHeatmap } from "@/components/ui/ActivityHeatmap";

// --- Types ---
interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation?: string;
  why_a_wrong?: string;
  why_b_wrong?: string;
  why_c_wrong?: string;
  why_d_wrong?: string;
  elimination_tip?: string;
}

interface RevisionItem {
  id: string;
  question_id: string;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  questions: Question;
}


export default function RevisionPage() {
  const { user } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<RevisionItem[]>([]);
  const [heatmapMap, setHeatmapMap] = useState<Record<string, number>>({});
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  
  const [sessionXP, setSessionXP] = useState(0);
  const [longestInterval, setLongestInterval] = useState(0);
  const [nextReviewDate, setNextReviewDate] = useState<number | null>(null);

  // Load Data
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      const todayStr = new Date().toISOString().split("T")[0];

      // 1. Fetch due questions
      const { data: qData } = await supabase
        .from("revision_queue")
        .select("*, questions(*)")
        .eq("user_id", user.uid)
        .lte("next_review_date", todayStr);

      if (qData) {
        setQueue(qData as unknown as RevisionItem[]);
      }

      // 2. Fetch future if empty
      if (!qData || qData.length === 0) {
        const { data: future } = await supabase
          .from("revision_queue")
          .select("next_review_date")
          .eq("user_id", user.uid)
          .gt("next_review_date", todayStr)
          .order("next_review_date", { ascending: true })
          .limit(1);

        if (future && future.length > 0) {
          const futureDate = new Date(future[0].next_review_date);
          const diffTime = futureDate.getTime() - new Date().getTime();
          setNextReviewDate(Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }
      }

      // 3. Fetch heatmap data (last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const ninetyStr = ninetyDaysAgo.toISOString().split("T")[0];

      const { data: hData } = await supabase
        .from("question_attempts")
        .select("attempt_date")
        .eq("user_id", user.uid)
        .gte("attempt_date", ninetyStr);

      if (hData) {
        const counts: Record<string, number> = {};
        hData.forEach(row => {
          counts[row.attempt_date] = (counts[row.attempt_date] || 0) + 1;
        });
        setHeatmapMap(counts);
      }

      setLoading(false);
    };

    loadData();
  }, [user]);

  const reviewedThisWeek = Object.entries(heatmapMap).filter(([dateStr]) => {
    const d = new Date(dateStr);
    const ago7 = new Date();
    ago7.setDate(ago7.getDate() - 7);
    return d >= ago7;
  }).reduce((acc, [, count]) => acc + count, 0);

  const handleSelectOption = (opt: string) => {
    if (isAnswered) return;
    setSelectedOption(opt);
    setIsAnswered(true);
  };

  const handleConfidence = async (level: "got_it" | "tricky") => {
    if (!user) return;
    const item = queue[currentIndex];
    const isCorrect = selectedOption === item.questions.correct_option;
    
    let newInterval = 1;
    let newEase = item.ease_factor;
    let newRepetitions = item.repetitions;
    let earnedXp = 0;

    if (level === "got_it" && isCorrect) {
      newInterval = Math.round(item.interval_days * item.ease_factor);
      if (newInterval < 1) newInterval = 1;
      newEase = Math.min(2.5, Number(item.ease_factor) + 0.1);
      newRepetitions += 1;
      earnedXp = 3;
    } else {
      newEase = Math.max(1.3, Number(item.ease_factor) - 0.2);
      earnedXp = 1;
    }

    if (newInterval > longestInterval) setLongestInterval(newInterval);
    setSessionXP(prev => prev + earnedXp);

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + newInterval);
    const nextReviewStr = nextReview.toISOString().split("T")[0];

    // Update Revision Queue
    await supabase.from("revision_queue").update({
      interval_days: newInterval,
      ease_factor: newEase,
      repetitions: newRepetitions,
      next_review_date: nextReviewStr,
      updated_at: new Date().toISOString()
    }).eq("id", item.id);

    // Update Profile XP
    const { error: rpcError } = await supabase.rpc('increment_xp', { user_id: user.uid, xp_amount: earnedXp });
    if (rpcError) {
      // Fallback if RPC doesn't exist
      supabase.from("profiles").select("xp").eq("id", user.uid).single().then(({data}) => {
        if (data) supabase.from("profiles").update({ xp: data.xp + earnedXp }).eq("id", user.uid).then();
      });
    }

    // Log Attempt
    const todayStr = new Date().toISOString().split("T")[0];
    await supabase.from("question_attempts").insert({
      user_id: user.uid,
      question_id: item.question_id,
      is_correct: isCorrect,
      attempt_date: todayStr
    });

    // Advance
    setIsAnswered(false);
    setSelectedOption(null);
    setCurrentIndex(i => i + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isComplete = currentIndex >= queue.length && queue.length > 0;
  const isEmpty = queue.length === 0;

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 mt-20 flex flex-col lg:flex-row gap-8">
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {isEmpty && !isComplete && (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#1a1a1a] border border-white/5 rounded-3xl p-12 text-center h-[500px]">
              <span className="text-6xl mb-6">🎉</span>
              <h2 className="text-3xl font-bold text-white mb-2">All caught up!</h2>
              <p className="text-gray-400 mb-6 text-lg">No questions due for review today.</p>
              
              {nextReviewDate !== null && (
                <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-full flex items-center gap-2 mb-8">
                  <CalIcon className="w-5 h-5 text-primary" />
                  <span className="text-gray-300 font-medium">Your next review is in <span className="text-white font-bold">{nextReviewDate}</span> days</span>
                </div>
              )}
              
              <Link href="/practice-tests" className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg">
                Practice New Questions
              </Link>
            </div>
          )}

          {isComplete && (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#1a1a1a] border border-white/5 rounded-3xl p-12 text-center h-[500px] animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Revision Complete! 🎉</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg mb-8">
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                  <p className="text-gray-400 text-sm mb-1">Reviewed</p>
                  <p className="text-2xl font-bold text-white">{queue.length}</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                  <p className="text-gray-400 text-sm mb-1">Max Interval</p>
                  <p className="text-2xl font-bold text-white">{longestInterval}d</p>
                </div>
                <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl">
                  <p className="text-primary/80 text-sm mb-1">XP Earned</p>
                  <p className="text-2xl font-bold text-primary">+{sessionXP}</p>
                </div>
              </div>
              
              <p className="text-gray-400 mb-8 max-w-md">Your memory is getting stronger! Come back tomorrow to keep those intervals growing.</p>
              
              <Link href="/" className="bg-white/10 text-white px-8 py-3 rounded-xl font-bold hover:bg-white/20 transition-colors border border-white/10">
                Back to Dashboard
              </Link>
            </div>
          )}

          {!isEmpty && !isComplete && (
            <div className="flex-1 flex flex-col">
              {/* Progress Strip */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">Due today: {queue.length}</h1>
                  <p className="text-sm text-gray-400">Reviewing {currentIndex + 1} of {queue.length}</p>
                </div>
                <div className="w-32 sm:w-48">
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>Progress</span>
                    <span>{Math.round((currentIndex / queue.length) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-background rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${(currentIndex / queue.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Question Card */}
              {(() => {
                const item = queue[currentIndex];
                const q = item.questions;
                const isCorrect = selectedOption === q.correct_option;

                return (
                  <div className="flex flex-col gap-4">
                    <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 lg:p-8">
                      <p className="text-white text-xl lg:text-2xl font-medium leading-relaxed mb-8">{q.question_text}</p>
                      
                      <div className="flex flex-col gap-3">
                        {(["A", "B", "C", "D"] as const).map(opt => {
                          const text = q[`option_${opt.toLowerCase()}` as keyof Question] as string;
                          const isSelected = selectedOption === opt;
                          const showAsCorrect = isAnswered && opt === q.correct_option;
                          const showAsWrong = isAnswered && isSelected && !isCorrect;

                          let btnStyle = "bg-background border-white/5 text-gray-300 hover:border-white/20 hover:text-white hover:bg-white/5";
                          if (isSelected) btnStyle = "bg-primary/10 border-primary shadow-[0_0_20px_rgba(255,191,0,0.08)] text-white";
                          
                          if (isAnswered) {
                            if (showAsCorrect) btnStyle = "bg-green-500/20 border-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.1)]";
                            else if (showAsWrong) btnStyle = "bg-red-500/20 border-red-500 text-white";
                            else btnStyle = "bg-background border-white/5 text-gray-600 opacity-50";
                          }

                          return (
                            <button
                              key={opt}
                              disabled={isAnswered}
                              onClick={() => handleSelectOption(opt)}
                              className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-4 ${btnStyle}`}
                            >
                              <span className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center font-bold text-sm transition-colors ${
                                showAsCorrect ? "bg-green-500 border-green-500 text-white" :
                                showAsWrong ? "bg-red-500 border-red-500 text-white" :
                                isSelected ? "bg-primary border-primary text-primary-foreground" : "border-white/20 text-gray-400"
                              }`}>
                                {opt}
                              </span>
                              <span className="mt-1 text-base leading-relaxed">{text}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Feedback & Confidence Panels */}
                    {isAnswered && (
                      <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
                        {/* Result Banner & Explanation */}
                        <div className={`p-6 rounded-2xl border ${isCorrect ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                          <div className={`flex items-center gap-2 font-bold mb-3 text-lg ${isCorrect ? "text-green-400" : "text-red-400"}`}>
                            {isCorrect ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                            {isCorrect ? "Correct!" : `Wrong. The correct answer was ${q.correct_option}`}
                          </div>
                          {q.explanation && <p className="text-gray-300 leading-relaxed text-base">{q.explanation}</p>}
                        </div>

                        {/* Why Wrong */}
                        {(q.why_a_wrong || q.why_b_wrong || q.why_c_wrong || q.why_d_wrong) && (
                          <div className="bg-[#1a1a1a] border border-amber-500/30 rounded-2xl p-6">
                            <h4 className="font-semibold text-amber-500 mb-4 text-base">Why the wrong options fail</h4>
                            <div className="space-y-3">
                              {(['A','B','C','D'] as const).map(opt => {
                                const wrongReason = q[`why_${opt.toLowerCase()}_wrong` as keyof Question] as string;
                                if (opt !== q.correct_option && wrongReason) {
                                  return (
                                    <div key={opt} className="text-sm">
                                      <span className="font-bold text-gray-400">Option {opt}:</span> <span className="text-gray-300 leading-relaxed">{wrongReason}</span>
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          </div>
                        )}

                        {/* Elimination Tip */}
                        {q.elimination_tip && (
                          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6">
                            <h4 className="font-semibold text-white mb-2 flex items-center gap-2 text-base">🎯 Elimination Tip</h4>
                            <p className="text-gray-300 leading-relaxed">{q.elimination_tip}</p>
                          </div>
                        )}

                        {/* Confidence Actions */}
                        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 mt-4 flex flex-col items-center text-center">
                          <h4 className="text-white font-medium mb-1">How well did you know this?</h4>
                          <p className="text-sm text-gray-400 mb-6">Your choice determines when you&apos;ll see this question again.</p>
                          
                          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                            <button 
                              onClick={() => handleConfidence("got_it")}
                              className="flex-1 flex flex-col items-center justify-center p-4 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl hover:bg-green-500/20 transition-colors gap-1 min-w-[160px]"
                            >
                              <span className="text-xl">👍</span>
                              <span className="font-bold">Got it</span>
                              <span className="text-xs opacity-70">Increase Interval</span>
                            </button>
                            
                            <button 
                              onClick={() => handleConfidence("tricky")}
                              className="flex-1 flex flex-col items-center justify-center p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500/20 transition-colors gap-1 min-w-[160px]"
                            >
                              <span className="text-xl">😅</span>
                              <span className="font-bold">Still tricky</span>
                              <span className="text-xs opacity-70">Review Tomorrow</span>
                            </button>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Right Sidebar (Stats & Heatmap) */}
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6">
          <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-primary" /> Revision Stats
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-background border border-white/5 p-4 rounded-xl text-center">
                <p className="text-gray-500 text-xs mb-1 uppercase tracking-wider font-semibold">Due Today</p>
                <p className="text-2xl font-bold text-white">{queue.length}</p>
              </div>
              <div className="bg-background border border-white/5 p-4 rounded-xl text-center">
                <p className="text-gray-500 text-xs mb-1 uppercase tracking-wider font-semibold">This Week</p>
                <p className="text-2xl font-bold text-primary">{reviewedThisWeek}</p>
              </div>
            </div>

            <div className="border-t border-white/5 pt-6">
              <ActivityHeatmap heatmapMap={heatmapMap} />
            </div>
          </div>
        </div>

      </div>
    </ProtectedRoute>
  );
}
