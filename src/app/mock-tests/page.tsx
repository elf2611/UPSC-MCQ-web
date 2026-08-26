"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useState, useEffect } from "react";
import { Plus, Clock, AlertTriangle, CheckCircle2, CircleDot, Users, ChevronRight, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

// --- Types ---
interface Test {
  id: string;
  name: string;
  description: string;
  question_count: number;
  duration_mins: number;
  type: "full" | "sectional";
  focus?: string;
  student_count?: number;
  status?: "not_attempted" | "in_progress" | "completed";
  score?: number;
  remaining_qs?: number;
  time_left?: number;
}




// --- Custom Test Modal ---
function CustomTestModal({ onClose, onStart }: { onClose: () => void; onStart: (cfg: { subjects: string[], questionCount: number, timeLimit: number }) => void }) {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(50);
  const [timeLimit, setTimeLimit] = useState(60);
  const subjects = ["Polity", "History", "Geography", "Economy", "Environment", "Science & Tech", "Current Affairs"];

  const toggle = (sub: string) => setSelectedSubjects(prev => prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card shadow-surface rounded-2xl p-8 w-full max-w-lg shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-display font-bold text-foreground">Create Custom Test</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Select Subjects</h3>
          <div className="flex flex-wrap gap-2">
            {subjects.map(sub => (
              <button
                key={sub}
                onClick={() => toggle(sub)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${selectedSubjects.includes(sub) ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-muted-foreground border-white/10 hover:border-white/30'}`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Number of Questions</h3>
          <div className="grid grid-cols-4 gap-2">
            {[10, 25, 50, 100].map(n => (
              <button
                key={n}
                onClick={() => setQuestionCount(n)}
                className={`py-2 rounded-lg text-sm font-bold border transition-colors ${questionCount === n ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-muted-foreground border-white/10 hover:border-white/30'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Time Limit: <span className="text-primary">{timeLimit} mins</span></h3>
          <input
            type="range" min={10} max={120} step={10}
            value={timeLimit}
            onChange={e => setTimeLimit(Number(e.target.value))}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground/70 mt-1"><span>10m</span><span>120m</span></div>
        </div>

        <button
          onClick={() => onStart({ subjects: selectedSubjects, questionCount, timeLimit })}
          disabled={selectedSubjects.length === 0}
          className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Start Custom Test
        </button>
      </div>
    </div>
  );
}

// --- Status Badge ---
function StatusBadge({ status }: { status: Test["status"] }) {
  if (status === "completed") return <span className="flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full"><CheckCircle2 className="w-3.5 h-3.5" />Completed</span>;
  if (status === "in_progress") return <span className="flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10  px-2.5 py-1 rounded-full"><CircleDot className="w-3.5 h-3.5" />In Progress</span>;
  return <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-secondary shadow-surface px-2.5 py-1 rounded-full"><CircleDot className="w-3.5 h-3.5" />Not Attempted</span>;
}

// --- Test Card ---
function TestCard({ test, onStart }: { test: Test; onStart: (id: string) => void }) {
  const isCompleted = test.status === "completed";
  const isInProgress = test.status === "in_progress";

  return (
    <div className={`bg-card shadow-surface border rounded-xl p-6 flex flex-col gap-4 transition-all hover:border-white/20 ${isInProgress ? 'border-primary/30 shadow-[0_0_20px_rgba(255,191,0,0.05)]' : 'border-white/5'}`}>
      <div className="flex items-start justify-between gap-3">
        <StatusBadge status={test.status} />
        {test.student_count && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <Users className="w-3.5 h-3.5" />
            {(test.student_count / 1000).toFixed(1)}k
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xl font-display font-bold text-foreground mb-1">{test.name}</h3>
        <p className="text-sm text-muted-foreground/70">{test.description}</p>
      </div>

      {isCompleted ? (
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><p className="text-muted-foreground/70 text-xs mb-0.5">Questions</p><p className="font-semibold text-foreground">{test.question_count}</p></div>
          <div><p className="text-muted-foreground/70 text-xs mb-0.5">Duration</p><p className="font-semibold text-foreground">{test.duration_mins}m</p></div>
          <div><p className="text-muted-foreground/70 text-xs mb-0.5">Score</p><p className="font-bold text-primary text-base">{test.score}</p></div>
        </div>
      ) : isInProgress ? (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-muted-foreground/70 text-xs mb-0.5">Remaining</p><p className="font-semibold text-foreground">{test.remaining_qs} Qs</p></div>
          <div><p className="text-muted-foreground/70 text-xs mb-0.5">Time Left</p><p className="font-bold text-primary">{test.time_left}m</p></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-muted-foreground/70 text-xs mb-0.5">Questions</p><p className="font-semibold text-foreground">{test.question_count}</p></div>
          <div><p className="text-muted-foreground/70 text-xs mb-0.5">Duration</p><p className="font-semibold text-foreground">{test.duration_mins}m</p></div>
        </div>
      )}

      {/* Difficulty Mix bar */}
      <div>
        <p className="text-xs text-muted-foreground/70 mb-1.5">Difficulty Mix</p>
        <div className="h-1.5 rounded-full overflow-hidden flex gap-0.5">
          <div className="bg-green-500 flex-1 rounded-l-full" />
          <div className="bg-amber-400 flex-[2]" />
          <div className="bg-rose-500 flex-1 rounded-r-full" />
        </div>
      </div>

      <button
        onClick={() => onStart(test.id)}
        className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-colors ${isCompleted ? 'bg-secondary text-muted-foreground hover:bg-white/10 shadow-surface' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
      >
        {isCompleted ? "View Analysis" : isInProgress ? "Resume Test" : "Start Test"}
      </button>
    </div>
  );
}

// --- Main Page ---
export default function MockTestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"full" | "sectional">("full");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fullTests, setFullTests] = useState<Test[]>([]);
  const [sectionalTests, setSectionalTests] = useState<Test[]>([]);

  useEffect(() => {
    const fetchTests = async () => {
      setLoading(true);
      try {
        const token = await user?.getIdToken();
        const res = await fetch('/api/mock-tests', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) throw new Error("Failed to fetch tests");
        
        const { tests, attempts } = await res.json();
        
        const mappedTests = tests.map((t: Test) => {
          const attempt = attempts.find((a: { test_id: string, score: number }) => a.test_id === t.id);
          return {
            ...t,
            status: attempt ? "completed" : "not_attempted",
            score: attempt ? attempt.score : undefined,
          };
        });

        setFullTests(mappedTests.filter((t: Test) => t.type === "full"));
        setSectionalTests(mappedTests.filter((t: Test) => t.type === "sectional"));
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchTests();
  }, [user]);

  const handleStartTest = (id: string) => {
    router.push(`/test-interface?mode=mock&test_id=${id}`);
  };

  const handleCustomStart = ({ subjects, questionCount, timeLimit }: { subjects: string[], questionCount: number, timeLimit: number }) => {
    setShowModal(false);
    const subjectsParam = subjects.join(",");
    router.push(`/test-interface?mode=custom&subjects=${encodeURIComponent(subjectsParam)}&count=${questionCount}&time=${timeLimit * 60}`);
  };

  const displayedTests = activeTab === "full" ? fullTests : sectionalTests;
  const featuredTest = fullTests.length > 0 ? fullTests[0] : null;

  return (
    <ProtectedRoute>
      {showModal && <CustomTestModal onClose={() => setShowModal(false)} onStart={handleCustomStart} />}

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Featured Assessment Banner */}
        
        {featuredTest && (
        <div className="bg-card shadow-surface border border-white/5 rounded-3xl p-10 md:p-14 mb-12 relative overflow-hidden group hover:shadow-surface-hover transition-all duration-500">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
            <div className="flex-1 max-w-3xl">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(255,191,0,0.8)] animate-pulse" />
                <span className="text-xs font-bold text-primary uppercase tracking-widest">GS Paper 1 Simulation</span>
              </div>
              <h2 className="text-5xl font-display font-bold text-foreground mb-4 text-balance tracking-tight">{featuredTest.name}</h2>
              <p className="text-xl text-muted-foreground mb-8 text-balance leading-relaxed">This is a full-length, strictly timed simulation designed to mimic the actual UPSC Civil Services Preliminary Examination.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                <div className="bg-background shadow-surface rounded-xl p-4">
                  <p className="text-muted-foreground/70 text-xs uppercase tracking-widest font-semibold mb-1">Duration</p>
                  <p className="text-2xl font-bold text-foreground tabular-nums">120 <span className="text-sm font-normal text-muted-foreground">mins</span></p>
                </div>
                <div className="bg-background shadow-surface rounded-xl p-4">
                  <p className="text-muted-foreground/70 text-xs uppercase tracking-widest font-semibold mb-1">Questions</p>
                  <p className="text-2xl font-bold text-foreground tabular-nums">100 <span className="text-sm font-normal text-muted-foreground">MCQs</span></p>
                </div>
                <div className="bg-background shadow-surface rounded-xl p-4">
                  <p className="text-muted-foreground/70 text-xs uppercase tracking-widest font-semibold mb-1">Scoring</p>
                  <p className="text-2xl font-bold text-green-400 tabular-nums">+2 <span className="text-sm font-normal text-muted-foreground">Marks</span></p>
                </div>
                <div className="bg-background shadow-surface rounded-xl p-4">
                  <p className="text-muted-foreground/70 text-xs uppercase tracking-widest font-semibold mb-1">Penalty</p>
                  <p className="text-2xl font-bold text-red-400 tabular-nums">-0.66 <span className="text-sm font-normal text-muted-foreground">Marks</span></p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start lg:items-end gap-2 mt-8 lg:mt-0">
              <button
                onClick={() => handleStartTest(featuredTest.id)}
                className="flex items-center gap-3 bg-primary text-primary-foreground px-10 py-5 rounded-2xl font-bold hover:scale-[0.98] active:scale-95 ease-snappy transition-all shadow-surface-glow text-lg"
              >
                Commence Test <ChevronRight className="w-6 h-6" />
              </button>
              <p className="text-xs font-medium text-muted-foreground/50 mt-4 uppercase tracking-widest">Requires 2 hours uninterrupted</p>
            </div>
          </div>
        </div>
        )}

                className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-lg font-bold hover:bg-primary/90 transition-colors shadow-surface-glow hover:scale-[0.98] active:scale-95 ease-snappy whitespace-nowrap"
              >
                Start Test Now <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Tabs */}
        <div className="flex items-center border-b border-white/10 mb-8">
          {(["full", "sectional"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-4 text-sm font-semibold transition-colors capitalize relative ${activeTab === tab ? "text-foreground" : "text-muted-foreground/70 hover:text-muted-foreground"}`}
            >
              {tab === "full" ? "Full-Length Tests" : "Sectional Tests"}
              {activeTab === tab && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t-full" />}
            </button>
          ))}
        </div>

        {/* Test Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Create Custom Test Card */}
          <button
            onClick={() => setShowModal(true)}
            className="bg-transparent border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center gap-4 hover:border-primary/40 hover:bg-primary/5 transition-all min-h-[300px] group"
          >
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/30 shadow-surface transition-colors">
              <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-display font-bold text-foreground mb-2">Create Custom Test</h3>
              <p className="text-sm text-muted-foreground/70 max-w-[200px]">Mix and match subjects to build a personalized assessment.</p>
            </div>
          </button>

          {loading ? (
             <div className="col-span-full py-12 text-center text-muted-foreground/70">Loading mock tests...</div>
          ) : displayedTests.length === 0 ? (
             <div className="col-span-full py-20 flex flex-col items-center text-center">
               <AlertTriangle className="w-12 h-12 text-gray-600 mb-4" />
               <h3 className="text-xl font-display font-bold text-foreground mb-2">No mock tests yet.</h3>
               <p className="text-muted-foreground/70">Admin will add them soon.</p>
             </div>
          ) : (
            displayedTests.map(test => (
              <TestCard key={test.id} test={test} onStart={handleStartTest} />
            ))
          )}
        </div>

      </div>
    </ProtectedRoute>
  );
}
