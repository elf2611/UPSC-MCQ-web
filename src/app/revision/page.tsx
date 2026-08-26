"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { 
  Inbox, Calendar, Activity, CheckCircle2, XCircle, Search, 
  Filter, Play, Archive, BrainCircuit, Loader2, ArrowRight
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface QueuedItem {
  id: string;
  question_text: string;
  subject: string;
  status: "tricky" | "got_it" | "wrong";
  due_date: string;
}

export default function RevisionInboxPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueuedItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Mocking an inbox-style list of revision items since we are rebuilding the UI layout
    // In production, fetch this from Supabase where status = 'marked_for_review' or 'wrong'
    setTimeout(() => {
      setQueue([
        { id: "1", question_text: "Which of the following bodies does not find mention in the Constitution?", subject: "Polity", status: "wrong", due_date: "Today" },
        { id: "2", question_text: "Consider the following statements regarding the 'Basic Structure' doctrine.", subject: "Polity", status: "tricky", due_date: "Today" },
        { id: "3", question_text: "The term 'Goldilocks Zone' is often seen in the news in the context of:", subject: "Science & Tech", status: "wrong", due_date: "Tomorrow" },
        { id: "4", question_text: "With reference to the Indian economy, consider the following statements on Inflation Targeting.", subject: "Economy", status: "tricky", due_date: "In 3 Days" },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const handleStartSession = () => {
    // Trigger standard test interface in revision mode
    router.push("/test-interface?mode=revision");
  };

  const handleArchive = (id: string) => {
    setQueue(q => q.filter(item => item.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground tracking-tight flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                <Inbox className="w-8 h-8 text-primary" />
              </div>
              Revision Inbox
            </h1>
            <p className="text-xl text-muted-foreground mt-4 text-balance">
              Spaced repetition queue for questions you found tricky or got wrong.
            </p>
          </div>

          <button
            onClick={handleStartSession}
            disabled={queue.length === 0}
            className="flex items-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold hover:scale-[0.98] active:scale-95 ease-snappy transition-all shadow-surface-glow disabled:opacity-50 disabled:pointer-events-none"
          >
            <Play className="w-5 h-5 fill-current" /> 
            Start Focus Session
          </button>
        </div>

        {queue.length === 0 ? (
          <div className="bg-card shadow-surface rounded-3xl p-16 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center mb-6 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-3xl font-display font-bold text-foreground mb-4">Zero Inbox</h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto leading-relaxed">
              Your revision queue is completely empty. Excellent work clearing your backlog!
            </p>
            <Link href="/practice-tests" className="mt-8 text-primary hover:text-primary-foreground hover:bg-primary px-6 py-2 rounded-lg transition-colors border border-primary/20 font-semibold">
              Find more questions
            </Link>
          </div>
        ) : (
          <div className="bg-card shadow-surface rounded-2xl overflow-hidden border border-white/5">
            {/* Header toolbar */}
            <div className="border-b border-white/5 p-4 flex items-center justify-between bg-background/50">
              <div className="flex items-center gap-4 px-2">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</span>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-8">Question</span>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-white/5 rounded-md text-muted-foreground transition-colors"><Search className="w-4 h-4" /></button>
                <button className="p-2 hover:bg-white/5 rounded-md text-muted-foreground transition-colors"><Filter className="w-4 h-4" /></button>
              </div>
            </div>

            {/* List */}
            <div className="divide-y divide-white/5">
              {queue.map(item => (
                <div key={item.id} className="group flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors">
                  
                  <div className="flex items-center gap-6 overflow-hidden pr-4">
                    {/* Status Badge */}
                    <div className="w-28 shrink-0">
                      {item.status === 'wrong' ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-md w-fit border border-red-500/20">
                          <XCircle className="w-3.5 h-3.5" /> Incorrect
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-md w-fit border border-amber-500/20">
                          <BrainCircuit className="w-3.5 h-3.5" /> Tricky
                        </div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground font-medium truncate group-hover:text-primary transition-colors text-base">{item.question_text}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs font-medium text-muted-foreground">
                        <span className="bg-background px-2 py-0.5 rounded shadow-surface">{item.subject}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Due {item.due_date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions (Hidden until hover) */}
                  <div className="shrink-0 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      title="Mark as Mastered"
                      onClick={() => handleArchive(item.id)}
                      className="p-2 hover:bg-green-500/20 hover:text-green-400 text-muted-foreground rounded-lg transition-colors border border-transparent hover:border-green-500/30"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    <button 
                      title="Retest Now"
                      onClick={() => router.push(`/test-interface?mode=revision&q=${item.id}`)}
                      className="p-2 hover:bg-primary/20 hover:text-primary text-muted-foreground rounded-lg transition-colors border border-transparent hover:border-primary/30"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
