"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";
import { XCircle } from "lucide-react";
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
  why_a_wrong?: string;
  why_b_wrong?: string;
  why_c_wrong?: string;
  why_d_wrong?: string;
  elimination_tip?: string;
  static_topic_link?: string;
}

interface AttemptAnswer {
  id: string;
  question_id: string;
  selected_option: string | null;
  is_correct: boolean;
  is_marked?: boolean;
  questions?: Question | null;
}

interface AttemptData {
  id: string;
  score: number;
  total_marks: number;
  time_taken_seconds: number;
  mode: string;
  submitted_at: string;
  correct_count: number;
  wrong_count: number;
  unattempted_count: number;
  accuracy_percent: number;
}

type FilterType = "All" | "Correct" | "Incorrect" | "Skipped";

// ── Utils ──────────────────────────────────────────────────────────────────
const formatTime = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0m 0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

const format = (dateString: string) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
};

// ── Main Component ─────────────────────────────────────────────────────────
export default function ResultsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const attemptId = searchParams.get("attempt_id");

  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [answers, setAnswers] = useState<AttemptAnswer[]>([]);
  const [filter, setFilter] = useState<FilterType>("All");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!attemptId || !user) {
        if (!user) return; // Wait for user to load from auth
        router.push('/');
        return;
      }
      
      try {
        const { data: attemptData, error: attemptError } = await supabase
          .from("test_attempts")
          .select("*")
          .eq("id", attemptId)
          .eq("user_id", user.uid)
          .single();

        if (attemptError || !attemptData) {
          console.error('Attempt fetch error:', attemptError);
          setErrorMsg(attemptError?.message || 'Results not found. The test may not have saved correctly.');
          setLoading(false);
          return;
        }

        console.log('=== RESULTS DEBUG ===')
        console.log('attempt_id from URL:', attemptId)
        console.log('current user uid:', user?.uid)
        console.log('attempt data:', JSON.stringify(attemptData, null, 2))
        console.log('attempt error:', attemptError)

        setAttempt(attemptData);

        const { data: answersData, error: answersError } = await supabase
          .from("attempt_answers")
          .select(`
            id,
            question_id,
            selected_option,
            is_correct,
            marked_for_review,
            questions (
              id,
              question_text,
              option_a,
              option_b,
              option_c,
              option_d,
              correct_option,
              explanation,
              why_a_wrong,
              why_b_wrong,
              why_c_wrong,
              why_d_wrong,
              elimination_tip,
              static_topic_link,
              subject,
              topic
            )
          `)
          .eq("attempt_id", attemptId)
          .order("id");

        console.log('answers count:', answersData?.length)
        console.log('first answer:', JSON.stringify(answersData?.[0], null, 2))
        console.log('answers error:', answersError)

        if (answersError) {
          console.error('Answers fetch error:', answersError);
        }

        const { count } = await supabase
          .from('attempt_answers')
          .select('*', { count: 'exact', head: true })
          .eq('attempt_id', attemptId)

        console.log('Answer count for this attempt:', count)

        setAnswers((answersData as unknown as AttemptAnswer[]) || []);

        console.log('=== ANSWER REVIEW DEBUG ===')
        answersData?.forEach((ans, i) => {
          console.log(`Q${i+1}:`, {
            question_id: ans.question_id,
            selected_option: ans.selected_option,
            is_correct: ans.is_correct,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            correct_option: (ans as any).questions?.correct_option,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            has_question: !!(ans as any).questions,
          })
        })

        const correctCount = answersData?.filter(a => a.is_correct === true).length
        const wrongCount = answersData?.filter(a => a.is_correct === false).length
        const skippedCount = answersData?.filter(a => !a.selected_option).length
        console.log('Correct:', correctCount, 
                    'Wrong:', wrongCount, 
                    'Skipped:', skippedCount)
      } catch (err) {
        console.error('Results fetch error:', err);
        setErrorMsg('Something went wrong loading results.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [attemptId, user, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212]">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (errorMsg || !attempt) return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212]">
      <div className="bg-[#1a1a1a] border border-red-500/30 p-8 rounded-2xl max-w-md text-center">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Error Loading Results</h2>
        <p className="text-gray-400 mb-6">{errorMsg || 'Could not load the results for this test.'}</p>
        <Link href="/" className="inline-block bg-amber-500 text-black px-6 py-3 rounded-lg font-bold hover:bg-amber-400 transition-colors">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );

  const score = attempt?.score ?? 0;
  const correct = attempt?.correct_count ?? 0;
  const wrong = attempt?.wrong_count ?? 0;
  const unattempted = attempt?.unattempted_count ?? 0;
  const accuracy = attempt?.accuracy_percent ?? 0;
  const totalMarks = attempt?.total_marks ?? 0;
  const timeTaken = attempt?.time_taken_seconds ?? 0;

  // Subject Breakdown
  const subjectBreakdown: Record<string, { correct: number; wrong: number; unattempted: number; total: number }> = {};
  
  answers.forEach(ans => {
    const subject = ans.questions?.subject || 'Unknown';
    if (!subjectBreakdown[subject]) {
      subjectBreakdown[subject] = { correct: 0, wrong: 0, unattempted: 0, total: 0 };
    }
    subjectBreakdown[subject].total++;
    
    if (!ans.selected_option) {
      subjectBreakdown[subject].unattempted++;
    } else if (ans.is_correct) {
      subjectBreakdown[subject].correct++;
    } else {
      subjectBreakdown[subject].wrong++;
    }
  });

  const chartData = Object.entries(subjectBreakdown).map(([subject, data]) => ({
    subject: subject.substring(0, 10), // truncate for chart
    correct: data.correct,
    wrong: data.wrong,
    skipped: data.unattempted,
  }));

  // Filtering
  const filteredAnswers = useMemo(() => {
    if (!answers || answers.length === 0) return []
    
    switch (filter) {
      case 'Correct':
        return answers.filter(ans => 
          ans.is_correct === true
        )
      
      case 'Incorrect':
        return answers.filter(ans => 
          ans.selected_option !== null && 
          ans.selected_option !== undefined &&
          ans.selected_option !== '' &&
          ans.is_correct !== true
        )
      
      case 'Skipped':
        return answers.filter(ans => 
          !ans.selected_option || 
          ans.selected_option === null ||
          ans.selected_option === ''
        )
      
      case 'All':
      default:
        return answers
    }
  }, [answers, filter]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black text-zinc-300 pb-20">
        {/* ── TOP HEADER ── */}
        <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h1 className="text-white font-semibold text-xl">Test Results</h1>
            <p className="text-zinc-400 text-sm mt-1">Submitted on {format(attempt.submitted_at)}</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <button onClick={() => router.push('/practice-tests')}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-800 transition-colors">
              Practice Again
            </button>
            <button onClick={() => router.push('/performance')}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-medium hover:bg-amber-400 transition-colors">
              View Performance →
            </button>
          </div>
        </div>

        {/* ── SCORE HERO SECTION ── */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 lg:p-6">
            
            {/* Big score card - takes 2 cols */}
            <div className="lg:col-span-2 bg-zinc-900 rounded-2xl p-6 border border-zinc-800 flex flex-col items-center justify-center text-center">
              {/* Circular score ring */}
              <div className="relative w-36 h-36 mb-4">
                <svg className="w-36 h-36 -rotate-90" viewBox="0 0 144 144">
                  <circle cx="72" cy="72" r="60" fill="none" stroke="#27272a" strokeWidth="12" />
                  <circle cx="72" cy="72" r="60"
                    fill="none" 
                    stroke={accuracy >= 60 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="12"
                    strokeDasharray={`${2 * Math.PI * 60}`}
                    strokeDashoffset={`${2 * Math.PI * 60 * (1 - accuracy/100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-amber-400">{accuracy}%</span>
                  <span className="text-zinc-400 text-xs mt-1">Accuracy</span>
                </div>
              </div>
              <div className="text-4xl font-bold text-white mb-1">
                {score.toFixed(1)}
                <span className="text-xl text-zinc-400 font-normal ml-1">/ {totalMarks}</span>
              </div>
              <p className="text-zinc-400 text-sm">Total Score</p>
            </div>

            {/* Stats grid - takes 3 cols */}
            <div className="lg:col-span-3 grid grid-cols-2 gap-4">
              {/* Correct */}
              <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 border-l-4 border-l-green-500 flex flex-col justify-center">
                <div className="text-3xl font-bold text-green-400 mb-1">{correct}</div>
                <div className="text-zinc-400 text-sm font-medium">Correct</div>
                <div className="text-green-500 text-xs mt-1 font-medium">+{(correct * 2).toFixed(2)} marks</div>
              </div>

              {/* Wrong */}
              <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 border-l-4 border-l-red-500 flex flex-col justify-center">
                <div className="text-3xl font-bold text-red-400 mb-1">{wrong}</div>
                <div className="text-zinc-400 text-sm font-medium">Incorrect</div>
                <div className="text-red-500 text-xs mt-1 font-medium">-{(wrong * (2/3)).toFixed(2)} marks</div>
              </div>

              {/* Skipped */}
              <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 border-l-4 border-l-zinc-500 flex flex-col justify-center">
                <div className="text-3xl font-bold text-zinc-300 mb-1">{unattempted}</div>
                <div className="text-zinc-400 text-sm font-medium">Skipped</div>
                <div className="text-zinc-500 text-xs mt-1 font-medium">0 marks</div>
              </div>

              {/* Time */}
              <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 border-l-4 border-l-blue-500 flex flex-col justify-center">
                <div className="text-3xl font-bold text-blue-400 mb-1">
                  {formatTime(timeTaken)}
                </div>
                <div className="text-zinc-400 text-sm font-medium">Time Taken</div>
                <div className="text-blue-500 text-xs mt-1 font-medium">
                  ~{Math.round((timeTaken || 0) / (correct + wrong + unattempted || 1))}s per question
                </div>
              </div>
            </div>
          </div>

          {/* ── SUBJECT BREAKDOWN CHART ── */}
          <div className="mx-4 lg:mx-6 mb-6 bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <h2 className="text-white font-semibold mb-6">Subject-wise Breakdown</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} barSize={20} margin={{ top: 5, right: 20, left: 0, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} tickMargin={15} />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', color: '#fff' }} />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="correct" fill="#22c55e" radius={[4,4,0,0]} name="Correct" />
                  <Bar dataKey="wrong" fill="#ef4444" radius={[4,4,0,0]} name="Wrong" />
                  <Bar dataKey="skipped" fill="#52525b" radius={[4,4,0,0]} name="Skipped" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-zinc-500 text-center py-8">No subject data available</p>
            )}
          </div>

          {/* ── QUESTION REVIEW ── */}
          <div className="mx-4 lg:mx-6 mb-6 bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
            
            {/* Filter chips */}
            <div className="flex flex-wrap items-center gap-2 p-4 border-b border-zinc-800 bg-zinc-900/50">
              <span className="text-white font-semibold mr-2">Question Review</span>
              {(['All', 'Correct', 'Incorrect', 'Skipped'] as FilterType[]).map(f => (
                <button key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    filter === f
                      ? 'bg-amber-500 text-black'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                  }`}>
                  {f} {f === 'All' ? `(${answers.length})` : f === 'Correct' ? `(${correct})` : f === 'Incorrect' ? `(${wrong})` : `(${unattempted})`}
                </button>
              ))}
            </div>

            {/* Question list */}
            <div className="divide-y divide-zinc-800/60">
              {filteredAnswers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-zinc-500 text-sm">
                    {answers?.length === 0 
                      ? 'Answer data not available for this attempt.'
                      : `No ${filter.toLowerCase()} questions found.`
                    }
                  </p>
                  {answers?.length === 0 && (
                    <p className="text-zinc-600 text-xs mt-2">
                      This can happen if the test was submitted 
                      before answers were saved. Future tests will 
                      show the full review.
                    </p>
                  )}
                </div>
              ) : filteredAnswers.map((ans) => {
                const originalIndex = answers.findIndex(a => a.question_id === ans.question_id);
                return (
                  <div key={ans.question_id} className="p-4 sm:p-6 hover:bg-zinc-800/20 transition-colors">
                    
                    {/* Question header */}
                    <div className="flex items-start gap-3 mb-4">
                      <span className={`flex-shrink-0 w-8 h-8 mt-0.5 rounded-full flex items-center justify-center text-sm font-bold ${
                          !ans.selected_option ? 'bg-zinc-800 text-zinc-400' : 
                          ans.is_correct ? 'bg-green-950 text-green-400 ring-1 ring-green-900' : 'bg-red-950 text-red-400 ring-1 ring-red-900'
                        }`}>
                        {originalIndex + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-zinc-200 text-base leading-relaxed">{ans.questions?.question_text}</p>
                        {ans.questions?.subject && (
                          <span className="inline-block mt-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">{ans.questions.subject}</span>
                        )}
                      </div>
                    </div>

                    {/* Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 ml-0 sm:ml-11">
                      {['a','b','c','d'].map(opt => {
                        const isCorrect = opt.toLowerCase() === ans.questions?.correct_option?.toLowerCase();
                        const isSelected = opt.toLowerCase() === ans.selected_option?.toLowerCase();
                        const text = ans.questions?.[`option_${opt}` as keyof Question];
                        
                        return (
                          <div key={opt} className={`px-4 py-3 rounded-xl text-sm flex items-start gap-3 border transition-colors ${
                            isCorrect ? 'border-green-600/50 bg-green-950/30 text-green-300' : 
                            isSelected && !isCorrect ? 'border-red-600/50 bg-red-950/30 text-red-300' : 
                            'border-zinc-800 bg-zinc-800/30 text-zinc-400'
                          }`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              isCorrect ? 'bg-green-700 text-white' : 
                              isSelected ? 'bg-red-700 text-white' : 'bg-zinc-700 text-zinc-300'
                            }`}>
                              {opt.toUpperCase()}
                            </span>
                            <span className="mt-0.5 leading-relaxed">{text}</span>
                            {isCorrect && <span className="ml-auto text-green-400 font-bold">✓</span>}
                            {isSelected && !isCorrect && <span className="ml-auto text-red-400 font-bold">✗</span>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation - collapsible */}
                    <details className="ml-0 sm:ml-11 group">
                      <summary className="text-amber-500 text-sm cursor-pointer hover:text-amber-400 font-medium inline-flex items-center gap-1 select-none">
                        View Explanation & Analysis <span className="text-xs opacity-60 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="mt-4 space-y-3">
                        {/* Explanation */}
                        {ans.questions?.explanation && (
                          <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                            <p className="text-zinc-300 text-xs font-bold uppercase tracking-wider mb-2">📖 Explanation</p>
                            <p className="text-zinc-400 text-sm leading-relaxed">{ans.questions.explanation}</p>
                          </div>
                        )}

                        {/* Why wrong */}
                        {['a','b','c','d'].some(opt => opt !== ans.questions?.correct_option?.toLowerCase() && ans.questions?.[`why_${opt}_wrong` as keyof Question]) && (
                          <div className="bg-red-950/20 rounded-xl p-4 border border-red-900/30">
                            <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-3">❌ Why wrong options fail</p>
                            <div className="space-y-2">
                              {['a','b','c','d'].map(opt => {
                                if (opt === ans.questions?.correct_option?.toLowerCase()) return null;
                                const why = ans.questions?.[`why_${opt}_wrong` as keyof Question] as string;
                                if (!why) return null;
                                return (
                                  <p key={opt} className="text-zinc-400 text-sm">
                                    <span className="text-zinc-300 font-medium">Option {opt.toUpperCase()}:</span> {why}
                                  </p>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Elimination tip */}
                        {ans.questions?.elimination_tip && (
                          <div className="bg-amber-950/20 rounded-xl p-4 border border-amber-900/30">
                            <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">🎯 Elimination Tip</p>
                            <p className="text-zinc-400 text-sm">{ans.questions.elimination_tip}</p>
                          </div>
                        )}

                        {/* Static link */}
                        {ans.questions?.static_topic_link && (
                          <div className="bg-blue-950/20 rounded-xl p-4 border border-blue-900/30">
                            <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">🔗 Static Connection</p>
                            <p className="text-zinc-400 text-sm">{ans.questions.static_topic_link}</p>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
