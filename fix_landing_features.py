import re

with open("src/app/page.tsx", "r") as f:
    c = f.read()

# Add new icons to imports
c = c.replace('import { CheckCircle2, TrendingUp, BookOpen, Clock, Target, PlayCircle, Star, ArrowRight, BrainCircuit, BarChart3, ChevronDown, Check, X, ShieldCheck, History, Newspaper, Trophy } from "lucide-react";',
'import { CheckCircle2, TrendingUp, BookOpen, Clock, Target, PlayCircle, Star, ArrowRight, BrainCircuit, BarChart3, ChevronDown, Check, X, ShieldCheck, History, Newspaper, Trophy, MessageSquareText, PenTool, Users, FileSignature } from "lucide-react";')

# We'll rewrite the Outcomes section to include 9 cards instead of 6, showcasing the newest features.
outcomes_grid_start = '<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">'
outcomes_grid_end = '          </div>\n        </div>\n      </section>\n\n      {/* 5. PRICING SECTION */}'

new_grid = """<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
              <Newspaper className="w-8 h-8 text-primary mb-5" />
              <h3 className="text-lg font-bold font-display text-foreground mb-2">Daily AI MCQs</h3>
              <p className="text-muted-foreground">Fresh questions generated daily from current affairs so you stay updated effortlessly.</p>
            </div>
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
              <PenTool className="w-8 h-8 text-primary mb-5" />
              <h3 className="text-lg font-bold font-display text-foreground mb-2">Mains Answer Writing</h3>
              <p className="text-muted-foreground">Distraction-free Mains editor with strict timers and instant, rubric-based AI scoring.</p>
            </div>
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors relative overflow-hidden">
              <div className="absolute top-0 right-0 px-2 py-1 bg-amber-500/20 text-amber-500 text-[10px] font-bold uppercase rounded-bl-lg">Elite</div>
              <MessageSquareText className="w-8 h-8 text-primary mb-5" />
              <h3 className="text-lg font-bold font-display text-foreground mb-2">AI Interview Board</h3>
              <p className="text-muted-foreground">Simulate UPSC Board Questions and get AI-powered feedback on structure and confidence.</p>
            </div>
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
              <Users className="w-8 h-8 text-primary mb-5" />
              <h3 className="text-lg font-bold font-display text-foreground mb-2">Cohort Leaderboards</h3>
              <p className="text-muted-foreground">Join a target-year cohort (e.g. UPSC 2026). Earn XP and compete in the Weekly Top 50.</p>
            </div>
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
              <FileSignature className="w-8 h-8 text-primary mb-5" />
              <h3 className="text-lg font-bold font-display text-foreground mb-2">Progress Contracts</h3>
              <p className="text-muted-foreground">Sign accountability contracts (e.g., "500 Qs in 30 Days") and track your milestones daily.</p>
            </div>
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors relative overflow-hidden">
              <div className="absolute top-0 right-0 px-2 py-1 bg-primary/20 text-primary text-[10px] font-bold uppercase rounded-bl-lg">Pro</div>
              <BrainCircuit className="w-8 h-8 text-primary mb-5" />
              <h3 className="text-lg font-bold font-display text-foreground mb-2">Doubt-Solving AI</h3>
              <p className="text-muted-foreground">Get instant, context-aware answers to tricky options from our grounded UPSC AI tutor.</p>
            </div>
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
              <Clock className="w-8 h-8 text-primary mb-5" />
              <h3 className="text-lg font-bold font-display text-foreground mb-2">Pacing Analytics</h3>
              <p className="text-muted-foreground">Compare your speed-per-question against global benchmarks to fix your exam timing.</p>
            </div>
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
              <History className="w-8 h-8 text-primary mb-5" />
              <h3 className="text-lg font-bold font-display text-foreground mb-2">Auto-Revision Queue</h3>
              <p className="text-muted-foreground">Our engine auto-queues stale topics and repeated mistakes for spaced-repetition.</p>
            </div>
            <div className="bg-card shadow-surface p-8 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
              <Target className="w-8 h-8 text-primary mb-5" />
              <h3 className="text-lg font-bold font-display text-foreground mb-2">Adaptive Difficulty</h3>
              <p className="text-muted-foreground">Questions scale automatically based on your rolling Elo ability score to keep you challenged.</p>
            </div>
"""

start_idx = c.find(outcomes_grid_start)
end_idx = c.find(outcomes_grid_end, start_idx)

if start_idx != -1 and end_idx != -1:
    c = c[:start_idx] + new_grid + c[end_idx:]

with open("src/app/page.tsx", "w") as f:
    f.write(c)
