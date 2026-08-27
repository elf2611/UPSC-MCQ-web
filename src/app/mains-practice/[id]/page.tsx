"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/protected-route";
import { Clock, ArrowLeft, Send, CheckCircle2, Loader2, LayoutTemplate } from "lucide-react";
import Link from "next/link";

export default function MainsWritingInterface() {
  const { id } = useParams();
  const { user } = useAuth();
  

  // In a real app, fetch the question using `id`. Using dummy data for now.
  const question = {
    id: id as string,
    paper: 'GS-2',
    topic: 'Polity',
    marks: 15,
    word_limit: 250,
    text: 'Analyze the role of the Election Commission of India in ensuring free and fair elections. What are the recent challenges it faces?'
  };

  const targetTimeSeconds = question.marks === 15 ? 11 * 60 : 7 * 60;
  
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(targetTimeSeconds);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [useScaffold, setUseScaffold] = useState(false);

  useEffect(() => {
    if (isSubmitting || result) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isSubmitting, result]);

  const wordCount = answer.trim().split(/\s+/).filter(w => w.length > 0).length;
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleToggleScaffold = () => {
    if (!useScaffold && answer.trim() === "") {
      setAnswer("Introduction:\n[Context and thesis statement]\n\nBody Paragraph 1:\n[First main point with evidence]\n\nBody Paragraph 2:\n[Second main point with evidence]\n\nConclusion:\n[Summary and forward-looking statement]\n");
    }
    setUseScaffold(!useScaffold);
  };

  const handleSubmit = async () => {
    if (!user || wordCount < 20) return;
    setIsSubmitting(true);
    setSubmissionProgress(10);
    
    // Simulate progress bar for long-running AI grading
    const progressInterval = setInterval(() => {
      setSubmissionProgress(prev => Math.min(90, prev + 5));
    }, 1000);

    try {
      const token = await user.getIdToken();
      // Normally we'd use the real DB question ID, but we just use the API we built
      // Wait, if the ID doesn't exist in Supabase, the API returns 404. 
      // We will handle the error gracefully here.
      const res = await fetch("/api/mains/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ questionId: question.id, answerText: answer, wordCount })
      });

      clearInterval(progressInterval);
      setSubmissionProgress(100);

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to grade answer.");
      }
      setResult(data.result);
    } catch (err: any) {
      clearInterval(progressInterval);
      alert(err.message || "Something went wrong.");
      setIsSubmitting(false);
    }
  };

  if (result) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#0B0B0F] py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Link href="/mains-practice" className="inline-flex items-center text-muted-foreground hover:text-primary mb-8 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Questions
            </Link>
            
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 mb-8">
              <h2 className="text-3xl font-bold font-display text-foreground mb-2 flex items-center">
                <CheckCircle2 className="w-8 h-8 text-green-500 mr-3" /> Evaluation Complete
              </h2>
              <p className="text-muted-foreground mb-8">Your answer has been graded against the standard UPSC rubric.</p>

              <div className="flex items-center justify-between p-6 bg-primary/10 border border-primary/20 rounded-xl mb-8">
                <div>
                  <p className="text-sm font-bold text-primary uppercase tracking-wider mb-1">Total Score</p>
                  <div className="flex items-baseline">
                    <span className="text-5xl font-bold font-display text-foreground">{result.score_total}</span>
                    <span className="text-muted-foreground ml-2">/ {question.marks}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Word Count: {result.word_count} / {question.word_limit}</p>
                  {result.word_count > question.word_limit && <p className="text-xs text-red-400">Word limit exceeded</p>}
                </div>
              </div>

              <h3 className="text-xl font-bold font-display text-foreground mb-4">Detailed Breakdown</h3>
              <div className="space-y-4 mb-8">
                {Object.entries(result.feedback_text.dimensions).map(([dim, feedback]) => {
                  const scoreKey = `score_${dim.toLowerCase()}`;
                  return (
                    <div key={dim} className="p-4 bg-background/50 border border-white/5 rounded-xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-foreground">{dim.replace('_', ' ')}</span>
                        <span className="font-bold text-primary">{result[scoreKey]} marks</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{feedback as string}</p>
                    </div>
                  );
                })}
              </div>

              <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
                <h3 className="text-lg font-bold font-display text-foreground mb-3">Overall Feedback</h3>
                <p className="text-muted-foreground leading-relaxed">{result.feedback_text.overall}</p>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0B0B0F] flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-white/5 bg-background flex items-center justify-between px-6 sticky top-0 z-10">
          <Link href="/mains-practice" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Exit
          </Link>
          <div className="flex items-center gap-6">
            <div className={`flex items-center font-display font-bold text-lg ${timeLeft < 60 ? 'text-red-400 animate-pulse' : 'text-primary'}`}>
              <Clock className="w-5 h-5 mr-2" />
              {formatTime(timeLeft)}
            </div>
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting || wordCount < 20}
              className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-lg shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              {isSubmitting ? 'Grading...' : 'Submit'}
            </button>
          </div>
        </header>

        {/* Progress Bar for AI Grading */}
        {isSubmitting && (
          <div className="h-1 w-full bg-background absolute top-16 left-0 z-20">
            <div className="h-full bg-primary transition-all duration-1000 ease-out" style={{ width: `${submissionProgress}%` }}></div>
          </div>
        )}

        <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-6">
          <div className="bg-card shadow-surface p-6 rounded-2xl border border-white/5 mb-6">
            <div className="flex justify-between items-start mb-4">
              <span className="px-3 py-1 bg-white/5 text-muted-foreground text-xs font-bold rounded-full">{question.paper} • {question.topic}</span>
              <span className="text-sm font-medium text-muted-foreground">{question.marks} Marks • {question.word_limit} Words</span>
            </div>
            <h2 className="text-xl font-medium text-foreground leading-relaxed">{question.text}</h2>
          </div>

          <div className="flex-1 flex flex-col bg-card shadow-surface rounded-2xl border border-white/5 overflow-hidden">
            <div className="h-12 border-b border-white/5 bg-background/50 flex items-center justify-between px-4">
              <button 
                onClick={handleToggleScaffold}
                disabled={answer.trim() !== "" && !useScaffold}
                className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors flex items-center disabled:opacity-50"
              >
                <LayoutTemplate className="w-4 h-4 mr-1" />
                {useScaffold ? "Scaffold On" : "Use Outline Scaffold"}
              </button>
              <span className={`text-xs font-bold ${wordCount > question.word_limit ? 'text-red-400' : 'text-muted-foreground'}`}>
                {wordCount} / {question.word_limit} words
              </span>
            </div>
            <textarea
              className="flex-1 w-full p-6 bg-transparent text-foreground resize-none focus:outline-none leading-relaxed"
              placeholder="Type your answer here..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
