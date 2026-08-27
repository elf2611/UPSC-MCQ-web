"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Mic, Send, MessageSquareText, Sparkles, CheckCircle2 } from "lucide-react";


export default function InterviewPrepPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [inputText, setInputText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/interview/questions", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setQuestions(data.questions);
          setResponses(data.responses);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleSubmit = async () => {
    if (!inputText.trim() || !selectedQuestion || !user) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/interview/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ questionId: selectedQuestion.id, responseText: inputText })
      });
      if (res.ok) {
        const data = await res.json();
        setFeedback(data.feedback);
        setResponses([data.feedback, ...responses]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212]">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 mt-16">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
            <Mic className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight mb-1 flex items-center gap-3">
              Mock Interview Module
              <span className="text-xs font-bold bg-amber-500/20 text-amber-500 px-2 py-1 rounded uppercase tracking-widest border border-amber-500/20">Elite</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              Simulate UPSC Board Questions and get AI-powered rubric feedback on your responses.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Questions List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="font-bold text-foreground mb-4">Board Questions</h2>
            {questions.map(q => {
              const hasAnswered = responses.some(r => r.question_id === q.id);
              const isSelected = selectedQuestion?.id === q.id;
              return (
                <button
                  key={q.id}
                  onClick={() => { setSelectedQuestion(q); setFeedback(null); setInputText(""); }}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${isSelected ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(255,191,0,0.1)]' : 'bg-card border-white/5 hover:border-white/20'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{q.category}</span>
                    {hasAnswered && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  </div>
                  <p className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>{q.question_text}</p>
                </button>
              );
            })}
          </div>

          {/* Right: Interaction Area */}
          <div className="lg:col-span-2">
            {!selectedQuestion ? (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-card border border-white/5 border-dashed rounded-2xl p-8 text-center">
                <MessageSquareText className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-2">Select a Question</h3>
                <p className="text-muted-foreground max-w-md">Choose a question from the left panel to begin your simulated mock interview.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Board Panel */}
                <div className="bg-card shadow-surface p-6 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                      <span className="text-lg">👔</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">Board Member</h3>
                      <p className="text-xs text-muted-foreground">UPSC Panel</p>
                    </div>
                  </div>
                  <p className="text-lg font-medium text-foreground">{selectedQuestion.question_text}</p>
                </div>

                {/* Response Input */}
                {!feedback && (
                  <div className="bg-card shadow-surface p-6 rounded-2xl border border-primary/20 relative">
                    <label className="block text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                      <Mic className="w-4 h-4 text-primary" /> Your Response (Transcript)
                    </label>
                    <textarea
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      placeholder="Type your complete answer exactly as you would speak it..."
                      className="w-full bg-background border border-white/10 rounded-xl p-4 text-foreground min-h-[200px] focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none resize-y"
                    />
                    <div className="flex justify-end mt-4">
                      <button 
                        onClick={handleSubmit} 
                        disabled={submitting || !inputText.trim()}
                        className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors shadow-surface"
                      >
                        {submitting ? <span className="animate-pulse">Analyzing...</span> : <>Submit to Board <Send className="w-4 h-4" /></>}
                      </button>
                    </div>
                  </div>
                )}

                {/* AI Feedback */}
                {feedback && (
                  <div className="bg-primary/5 shadow-surface p-6 rounded-2xl border border-primary/20 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="text-xl font-bold font-display text-primary flex items-center gap-2">
                        <Sparkles className="w-5 h-5" /> Board Assessment
                      </h3>
                      <div className="text-right">
                        <div className="text-3xl font-bold font-display text-foreground">{feedback.score_total}/100</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Overall Score</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-card p-4 rounded-xl border border-white/5">
                        <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">Confidence & Tone</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{feedback.feedback_confidence}</p>
                      </div>
                      <div className="bg-card p-4 rounded-xl border border-white/5">
                        <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">Structure</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{feedback.feedback_structure}</p>
                      </div>
                      <div className="bg-card p-4 rounded-xl border border-white/5">
                        <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">Content Depth</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{feedback.feedback_content}</p>
                      </div>
                    </div>

                    <button onClick={() => { setFeedback(null); setInputText(""); }} className="text-sm text-primary font-bold hover:underline">
                      Try another response
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
