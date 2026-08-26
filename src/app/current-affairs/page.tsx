"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, ChevronRight, Newspaper, ArrowRight, Loader2, Sparkles, BookOpen } from "lucide-react";
import Link from "next/link";

interface DateInfo {
  date: string;
  count: number;
}

export default function CurrentAffairsPage() {
  const [dates, setDates] = useState<DateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Inline generation state mock
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth");
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchDates() {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/current-affairs/dates", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setDates(data.dates || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (user) fetchDates();
  }, [user]);

  const handleGenerate = (dateStr: string) => {
    setGeneratingFor(dateStr);
    // Simulate AI generation delay
    setTimeout(() => {
      setGeneratingFor(null);
      setGeneratedQuestions(dateStr);
    }, 2500);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const hasToday = dates.some(d => d.date === todayStr);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-12 border-b border-white/5 pb-8">
        <h1 className="text-4xl font-display font-bold text-foreground text-balance tracking-tight mb-4 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
            <Newspaper className="w-8 h-8 text-primary" />
          </div>
          Daily Current Affairs
        </h1>
        <p className="text-xl text-muted-foreground text-balance max-w-2xl">
          Dynamic news feed processed by AI. Generate MCQs inline to test your retention instantly.
        </p>
      </div>

      {dates.length === 0 ? (
        <div className="bg-card shadow-surface rounded-2xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-6" />
          <h2 className="text-2xl font-display font-bold text-foreground mb-3">Feed Empty</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Our AI is currently scouring the news. Check back later for today's curated feed.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {dates.map((d, idx) => (
              <div key={d.date} className="bg-card shadow-surface rounded-2xl overflow-hidden group hover:shadow-surface-hover transition-all duration-300">
                <div className="p-6 md:p-8">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold tracking-widest uppercase text-primary">The Hindu / IE</span>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
                           {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <h2 className="text-2xl font-display font-bold text-foreground text-balance">
                        {idx === 0 && hasToday ? "Today's Critical Updates" : `Daily Digest: ${new Date(d.date).toLocaleDateString(undefined, { weekday: 'long' })}`}
                      </h2>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground text-pretty mb-8 line-clamp-2">
                    A curated selection of the most important national and international events for UPSC Prelims. Click below to test your knowledge.
                  </p>

                  {/* Inline Action Area */}
                  <div className="pt-6 border-t border-white/5">
                    {generatedQuestions === d.date ? (
                       <div className="animate-in slide-in-from-top-2 fade-in duration-300 ease-snappy">
                         <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl p-4">
                           <div className="flex items-center gap-3">
                             <Sparkles className="w-5 h-5 text-primary" />
                             <span className="font-medium text-foreground">{d.count} Questions Ready</span>
                           </div>
                           <Link
                             href={`/test-interface?mode=current-affairs&date=${d.date}`}
                             className="bg-primary text-primary-foreground font-bold px-6 py-2 rounded-lg hover:scale-[0.98] active:scale-95 ease-snappy transition-transform shadow-surface-glow"
                           >
                             Take Test
                           </Link>
                         </div>
                       </div>
                    ) : generatingFor === d.date ? (
                      <div className="flex items-center justify-center gap-3 bg-background shadow-surface rounded-xl p-4 animate-pulse">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        <span className="text-sm font-medium text-muted-foreground">AI is reading the news and generating questions...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground font-medium">{d.count} potential questions detected</span>
                        <button
                          onClick={() => handleGenerate(d.date)}
                          className="flex items-center gap-2 bg-secondary text-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-white/10 transition-colors shadow-surface"
                        >
                          <Sparkles className="w-4 h-4 text-primary" />
                          Generate MCQs
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar / Info */}
          <div className="space-y-6">
            <div className="bg-card shadow-surface rounded-2xl p-8 sticky top-28">
              <h3 className="font-display font-bold text-xl text-foreground mb-4">Editorial Guidelines</h3>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0 shadow-[0_0_8px_rgba(255,191,0,0.8)]" />
                  <p className="text-pretty">Current affairs make up a significant portion of the UPSC Prelims. We source exclusively from The Hindu and Indian Express.</p>
                </li>
                <li className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0 shadow-[0_0_8px_rgba(255,191,0,0.8)]" />
                  <p className="text-pretty">Daily revision helps consolidate memory better than monthly cramming.</p>
                </li>
                <li className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0 shadow-[0_0_8px_rgba(255,191,0,0.8)]" />
                  <p className="text-pretty">Questions are generated with Gemini AI, featuring precise elimination tips to build your intuition.</p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
