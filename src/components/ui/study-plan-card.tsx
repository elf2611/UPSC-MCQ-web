"use client";

import { useEffect, useState } from "react";
import { Calendar, Target, RefreshCw, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface PlanDay {
  id: string;
  day_date: string;
  subject_name: string;
  action_type: string;
  target_count: number;
  completed: boolean;
}

export function StudyPlanCard() {
  const { user } = useAuth();
  const [days, setDays] = useState<PlanDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const fetchPlan = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      // Wait, there is no GET /api/study-plan endpoint yet. 
      // I will create it momentarily.
      const res = await fetch("/api/study-plan", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 404) {
          setDays([]);
        } else {
          throw new Error("Failed to load plan");
        }
      } else {
        const data = await res.json();
        setDays(data.days || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [user]);

  const generatePlan = async () => {
    if (!user) return;
    setGenerating(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/study-plan/generate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to generate plan");
      await fetchPlan();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-card shadow-surface rounded-xl p-6 border border-white/5 animate-pulse mb-8">
        <div className="h-6 w-48 bg-white/10 rounded mb-4"></div>
        <div className="h-24 w-full bg-white/5 rounded"></div>
      </div>
    );
  }

  // Find today's plan
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPlan = days.find(d => d.day_date === todayStr);

  if (days.length === 0) {
    return (
      <div className="bg-card shadow-surface rounded-xl p-8 border border-primary/20 mb-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground flex items-center mb-2">
            <Target className="w-6 h-6 text-primary mr-2" /> Stop guessing what to study.
          </h2>
          <p className="text-muted-foreground max-w-xl">
            Generate a personalized weekly study plan based on your weakest subjects and spaced-repetition backlog.
          </p>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>
        <button
          onClick={generatePlan}
          disabled={generating}
          className="mt-6 md:mt-0 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-[0_0_20px_rgba(255,191,0,0.2)] hover:shadow-[0_0_30px_rgba(255,191,0,0.4)] disabled:opacity-50 transition-all flex items-center"
        >
          {generating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <RefreshCw className="w-5 h-5 mr-2" />}
          {generating ? "Analyzing Weaknesses..." : "Generate My Plan"}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card shadow-surface rounded-xl p-6 border border-white/5 mb-8">
      <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
        <h2 className="text-xl font-bold font-display text-foreground flex items-center">
          <Calendar className="w-5 h-5 text-primary mr-2" /> This Week&apos;s Plan
        </h2>
        <button 
          onClick={generatePlan}
          disabled={generating}
          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center disabled:opacity-50"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
          Regenerate
        </button>
      </div>

      {todayPlan && (
        <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Today&apos;s Focus</p>
          <div className="flex justify-between items-center">
            <p className="text-lg font-bold text-foreground">
              {todayPlan.action_type === 'practice' && `Practice ${todayPlan.target_count} ${todayPlan.subject_name} questions`}
              {todayPlan.action_type === 'revision' && `Review ${todayPlan.target_count} flagged ${todayPlan.subject_name} questions`}
              {todayPlan.action_type === 'sectional_test' && `Take a ${todayPlan.target_count}-Q ${todayPlan.subject_name} sectional test`}
              {todayPlan.action_type === 'mock' && `Attempt Full-Length Mock Test`}
            </p>
            <button className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg text-sm shadow-md hover:bg-primary/90 transition-colors flex items-center">
              Start Now <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        {days.map(d => {
          const dateObj = new Date(d.day_date);
          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
          const isToday = d.day_date === todayStr;

          return (
            <div 
              key={d.id} 
              className={`p-3 rounded-xl border flex flex-col items-center text-center ${
                isToday ? 'border-primary/50 bg-primary/5' : 'border-white/5 bg-background/50'
              } ${d.completed ? 'opacity-50' : ''}`}
            >
              <span className={`text-xs font-bold mb-2 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{dayName}</span>
              <span className="text-xs text-foreground font-medium mb-1 line-clamp-1">{d.subject_name}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{d.action_type.replace('_', ' ')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
