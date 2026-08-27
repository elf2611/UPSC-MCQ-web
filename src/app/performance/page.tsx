"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import { TrendingUp, Award, Flame, ExternalLink, Activity, Target as TargetIcon, Clock } from "lucide-react";
import Link from "next/link";
import { ActivityHeatmap } from "@/components/ui/ActivityHeatmap";


const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card shadow-surface-glow p-4 rounded-xl border border-white/10">
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-2">{label}</p>
        <p className="text-primary font-display font-bold tabular-nums text-2xl">
          {payload[0].value.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">Score</span>
        </p>
      </div>
    );
  }
  return null;
};

// ── Types ──────────────────────────────────────────────────────────────────
interface ProfileData {
  xp: number;
  level: number;
  streak_count: number;
}

interface WeakTopic {
  topic_name: string;
  subject_name: string;
  subject_slug: string;
  topic_slug: string;
  accuracy: number;
  attempted: number;
}

interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  earned?: boolean;
  earnedAt?: string;
}

const LEVEL_NAMES = ["Aspirant", "Practitioner", "Scholar", "Expert", "Master", "IAS Ready"];
const THRESHOLDS = [0, 500, 1500, 3000, 6000, 10000];

const ALL_BADGES: BadgeDef[] = [
  { id: "first_question", name: "First Step", icon: "🥇", desc: "Attempt your first question" },
  { id: "seven_streak", name: "Week Warrior", icon: "🔥", desc: "7 day streak" },
  { id: "thirty_streak", name: "Streak Legend", icon: "🏆", desc: "30 day streak" },
  { id: "hundred_correct", name: "Century", icon: "💯", desc: "100 correct answers" },
  { id: "five_mocks", name: "Mock Master", icon: "📝", desc: "Complete 5 mock tests" },
  { id: "polity_ace", name: "Polity Pro", icon: "⚖️", desc: "80%+ accuracy in Polity (20+ qs)" },
  { id: "ca_champ", name: "CA Champ", icon: "📰", desc: "Practice 30 current affairs questions" },
  { id: "geo_ace", name: "Geography Ace", icon: "🌍", desc: "80%+ in Geography" },
  { id: "scholar", name: "Scholar", icon: "📚", desc: "Reach Level 3" }
];

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color, progress }: { label: string; value: string; sub?: React.ReactNode; icon: React.ReactNode; color: string; progress?: { current: number, max: number } }) {
  return (
    <div className="bg-card shadow-surface rounded-2xl p-5 flex flex-col justify-between">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground/70 font-medium mb-0.5">{label}</p>
          <p className="text-2xl font-extrabold text-foreground">{value}</p>
          {sub && <div className="text-xs text-muted-foreground/50 mt-1">{sub}</div>}
        </div>
      </div>
      {progress && (
        <div className="mt-4">
          <div className="h-1.5 bg-background shadow-surface rounded-full overflow-hidden shadow-surface">
            <div 
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${Math.min(100, (progress.current / progress.max) * 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground/70 text-right mt-1 font-medium">{progress.current} / {progress.max} XP</div>
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function PerformancePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<any[]>([]);
  const [pacingData, setPacingData] = useState<{benchmarks: any[], userPacing: any[]}>({ benchmarks: [], userPacing: [] });
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractForm, setContractForm] = useState({ goalType: "questions", targetValue: 500, durationDays: 30 });
  
  // Data States
  const [attempts, setAttempts] = useState<Record<string, unknown>[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [totalPracticed, setTotalPracticed] = useState(0);
  const [overallAccuracy, setOverallAccuracy] = useState(0);
  const [heatmapMap, setHeatmapMap] = useState<Record<string, number>>({});
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [badges, setBadges] = useState<BadgeDef[]>(ALL_BADGES);

  useEffect(() => {
    // Don't fetch until we have the user uid specifically
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const uid = user.uid;
    console.log('Fetching performance for uid:', uid);

    const load = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/user-statistics', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          
          // 1. Profile
          setProfile(data.profile);
          
          // 2. Attempts
          const testData = data.tests;
          setAttempts(testData);
          
          // 3. Compute accuracy & heatmap
          const answersData = data.answers;
          const totalPracticedCount = answersData.length;
          const totalCorrectCount = answersData.filter((a: Record<string, unknown>) => a.is_correct).length;
          
          const heatCounts: Record<string, number> = {};
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
          const ninetyStr = ninetyDaysAgo.toISOString().split("T")[0];
          
          answersData.forEach((row: Record<string, unknown>) => {
            if (typeof row.created_at === 'string') {
              const d = row.created_at.split("T")[0];
              if (d >= ninetyStr) heatCounts[d] = (heatCounts[d] || 0) + 1;
            }
          });
          
          setTotalPracticed(totalPracticedCount);
          setOverallAccuracy(totalPracticedCount > 0 ? Math.round((totalCorrectCount / totalPracticedCount) * 100) : 0);
          setHeatmapMap(heatCounts);
          
          // 4. Weak Topics
          const weakData = data.weakTopics;
          setWeakTopics(weakData.map((w: Record<string, unknown>) => ({
            topic_name: w.subject_id || "Unknown Subject",
            topic_slug: "",
            subject_name: w.subject_id || "Unknown Subject",
            subject_slug: "",
            accuracy: Number(w.accuracy_percent),
            attempted: Number(w.total_attempted)
          })));
          
          // 5. Badges
          const badgeData = data.badges;
          const earnedMap = new Map<string, string | undefined>(badgeData.map((b: Record<string, unknown>) => [b.badge_name as string, b.earned_at as string | undefined]));
          const mergedBadges = ALL_BADGES.map(b => ({
            ...b,
            earned: earnedMap.has(b.name),
            earnedAt: earnedMap.get(b.name) as string | undefined
          }));
          setBadges(mergedBadges);
        }

        // Fetch pacing
        const paceRes = await fetch("/api/performance/pacing", { headers: { Authorization: `Bearer ${token}` } });
        if (paceRes.ok) {
          setPacingData(await paceRes.json());
        }


        // Fetch contracts
        const contRes = await fetch("/api/contracts", { headers: { Authorization: `Bearer ${token}` } });
        if (contRes.ok) {
          const contData = await contRes.json();
          setContracts(contData.contracts || []);
        }

      } catch (err) {
        console.error('Performance fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);


  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(contractForm)
      });
      if (res.ok) {
        setShowContractModal(false);
        const contRes = await fetch("/api/contracts", { headers: { Authorization: `Bearer ${token}` } });
        if (contRes.ok) {
          const contData = await contRes.json();
          setContracts(contData.contracts || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212]">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212]">
      <div className="text-center">
        <span className="text-5xl mb-4 block">🔐</span>
        <p className="text-muted-foreground">Please log in to view your performance.</p>
      </div>
    </div>
  );

  if (attempts.length === 0) return (
    <ProtectedRoute>

      {showContractModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card shadow-surface rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white/5">
            <h2 className="text-xl font-display font-bold text-foreground mb-6 flex items-center">
              <TargetIcon className="w-5 h-5 text-primary mr-2" /> New Progress Contract
            </h2>
            <form onSubmit={handleCreateContract} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Goal Type</label>
                <select 
                  className="w-full bg-background border border-white/10 rounded-lg p-3 text-foreground"
                  value={contractForm.goalType}
                  onChange={e => setContractForm({...contractForm, goalType: e.target.value})}
                >
                  <option value="questions">Total Questions Solved</option>
                  <option value="accuracy">Average Accuracy (%)</option>
                  <option value="streak">Daily Streak</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Target Value</label>
                <input 
                  type="number" 
                  className="w-full bg-background border border-white/10 rounded-lg p-3 text-foreground"
                  value={contractForm.targetValue}
                  onChange={e => setContractForm({...contractForm, targetValue: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowContractModal(false)} className="px-4 py-2 text-muted-foreground hover:text-foreground">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90">Sign Contract</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="flex flex-col items-center justify-center gap-4 text-center max-w-sm">
          <span className="text-6xl">📊</span>
          <h2 className="text-3xl font-display font-bold text-foreground tabular-nums tracking-tight text-foreground text-balance">No performance data yet</h2>
          <p className="text-muted-foreground">Complete a practice session or mock test to see your analytics here.</p>
          <a href="/practice-tests" className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors">
            Start Practicing →
          </a>
        </div>
      </div>
    </ProtectedRoute>
  );

  const lvlIdx = (profile?.level || 1) - 1;
  const levelName = LEVEL_NAMES[lvlIdx] || `Level ${profile?.level}`;
  const nextThreshold = THRESHOLDS[lvlIdx + 1] || THRESHOLDS[THRESHOLDS.length - 1];

  return (
    <ProtectedRoute>

      {showContractModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-card shadow-surface rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white/5">
            <h2 className="text-xl font-display font-bold text-foreground mb-6 flex items-center">
              <TargetIcon className="w-5 h-5 text-primary mr-2" /> New Progress Contract
            </h2>
            <form onSubmit={handleCreateContract} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Goal Type</label>
                <select 
                  className="w-full bg-background border border-white/10 rounded-lg p-3 text-foreground"
                  value={contractForm.goalType}
                  onChange={e => setContractForm({...contractForm, goalType: e.target.value})}
                >
                  <option value="questions">Total Questions Solved</option>
                  <option value="accuracy">Average Accuracy (%)</option>
                  <option value="streak">Daily Streak</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Target Value</label>
                <input 
                  type="number" 
                  className="w-full bg-background border border-white/10 rounded-lg p-3 text-foreground"
                  value={contractForm.targetValue}
                  onChange={e => setContractForm({...contractForm, targetValue: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowContractModal(false)} className="px-4 py-2 text-muted-foreground hover:text-foreground">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90">Sign Contract</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-8 lg:py-12 mt-16">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground text-balance">Performance Analytics</h1>
          <p className="text-muted-foreground mt-1">Track your growth and identify areas to improve.</p>
        </div>

        {/* Upgraded Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard 
            label="Total Questions Practiced" 
            value={totalPracticed.toString()} 
            sub="questions attempted" 
            icon={<TargetIcon className="w-5 h-5 text-primary" />} 
            color="bg-primary/10 border-primary/20" 
          />
          <StatCard 
            label="Overall Accuracy" 
            value={`${overallAccuracy}%`} 
            sub="across all subjects" 
            icon={<TrendingUp className="w-5 h-5 text-green-400" />} 
            color="bg-green-500/10 border-green-500/20" 
          />
          <StatCard 
            label="Current Streak 🔥" 
            value={profile?.streak_count.toString() || "0"} 
            sub="days active in a row" 
            icon={<Flame className="w-5 h-5 text-orange-400" />} 
            color="bg-orange-500/10 border-orange-500/20" 
          />
          <StatCard 
            label={`Level ${profile?.level || 1}`} 
            value={levelName}
            icon={<Award className="w-5 h-5 text-purple-400" />} 
            color="bg-purple-500/10 border-purple-500/20" 
            progress={{ current: profile?.xp || 0, max: nextThreshold }}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Score Trend Line Chart */}
          <div className="lg:col-span-2 bg-card shadow-surface rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-foreground font-display font-bold text-lg">Score Trend (Last 10 Tests)</h3>
            </div>
            <div className="h-64">
              {attempts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...attempts].reverse().map((a, i) => ({ name: `T${i+1}`, score: a.score }))}>
                    <defs>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffbf00" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ffbf00" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2a2a" />
                    <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 2, strokeDasharray: "3 3" }} />
                    <Line type="monotone" dataKey="score" stroke="#ffbf00" strokeWidth={3} dot={{ fill: "#ffbf00", r: 5, strokeWidth: 2, stroke: "#1a1a1a" }} activeDot={{ r: 7 }} isAnimationActive={true} animationDuration={2000} animationEasing="ease-in-out" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground/70">Take some tests to see your trend</div>
              )}
            </div>
          </div>

          {/* Radar Chart (Subject Mastery placeholder for now since we don't have aggregated subject radar data easily available, keeping existing UI structure) */}
          
          <div className="bg-card shadow-surface rounded-2xl p-6">
            <h3 className="text-foreground font-display font-bold text-lg mb-6">Subject Competency</h3>
            {weakTopics.length > 0 ? (
              <div className="space-y-6">
                 <div>
                   <p className="text-xs font-bold text-green-400 uppercase tracking-widest mb-3">Strongest Pillar</p>
                   {(() => {
                      const strong = [...weakTopics].sort((a, b) => b.accuracy - a.accuracy)[0];
                      if (strong && strong.accuracy >= 50) return (
                         <div className="flex justify-between items-center bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                            <div><p className="text-green-300 font-bold">{strong.topic_name}</p><p className="text-xs text-green-500/70">{strong.subject_name}</p></div>
                            <span className="text-xl font-display font-bold tabular-nums text-green-400">{strong.accuracy.toFixed(1)}%</span>
                         </div>
                      );
                      return <div className="text-xs text-muted-foreground/70">Need higher accuracy to determine strongest subject.</div>;
                   })()}
                 </div>
                 <div>
                   <p className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">Needs Immediate Focus</p>
                   {(() => {
                      const weak = [...weakTopics].sort((a, b) => a.accuracy - b.accuracy)[0];
                      if (weak && weak.accuracy < 50) return (
                         <div className="flex justify-between items-center bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                            <div><p className="text-red-300 font-bold">{weak.topic_name}</p><p className="text-xs text-red-500/70">{weak.subject_name}</p></div>
                            <span className="text-xl font-display font-bold tabular-nums text-red-400">{weak.accuracy.toFixed(1)}%</span>
                         </div>
                      );
                      return <div className="text-xs text-muted-foreground/70">No critically weak subjects identified yet.</div>;
                   })()}
                 </div>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-sm text-muted-foreground/70 border border-dashed border-white/10 rounded-xl text-center px-6 text-balance">
                Complete subject-specific tests to unlock strength analysis.
              </div>
            )}
          </div>

        </div>

        
        {/* Progress Contracts */}
        <section className="mb-12">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground">Progress Contracts</h2>
              <p className="text-muted-foreground">Commit to a goal. Reach it to unlock exclusive badges.</p>
            </div>
            <button onClick={() => setShowContractModal(true)} className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary/20 transition-colors">
              + New Contract
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contracts.length === 0 && (
              <div className="col-span-full p-8 border border-white/5 border-dashed rounded-2xl flex flex-col items-center justify-center text-center">
                <TargetIcon className="w-8 h-8 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">No active contracts. Sign one to push your limits!</p>
              </div>
            )}
            {contracts.map(contract => {
              const progressPct = Math.min(100, Math.round((contract.current_progress / contract.target_value) * 100));
              const daysLeft = Math.max(0, Math.ceil((new Date(contract.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24)));
              return (
                <div key={contract.id} className="bg-card shadow-surface p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                  <div className={`absolute top-0 right-0 w-32 h-32 blur-[50px] rounded-full pointer-events-none transition-opacity ${contract.status === 'succeeded' ? 'bg-green-500/20' : contract.status === 'failed' ? 'bg-red-500/20' : 'bg-primary/10'}`} />
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <span className="bg-white/5 text-muted-foreground text-xs font-bold px-2 py-1 rounded capitalize">{contract.goal_type}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${contract.status === 'succeeded' ? 'bg-green-500/20 text-green-400' : contract.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-500'}`}>
                      {contract.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold font-display text-foreground mb-1 relative z-10">Target: {contract.target_value}</h3>
                  <p className="text-sm text-muted-foreground mb-6 relative z-10">{daysLeft} days remaining</p>
                  
                  <div className="relative z-10">
                    <div className="flex justify-between text-xs font-medium mb-2">
                      <span className="text-foreground">{contract.current_progress} / {contract.target_value}</span>
                      <span className="text-primary">{progressPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                      <div className={`h-full transition-all ${contract.status === 'succeeded' ? 'bg-green-400' : contract.status === 'failed' ? 'bg-red-400' : 'bg-primary'}`} style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        
        {/* Pacing Analytics */}
        <section className="mb-12">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground flex items-center">
                <Clock className="w-6 h-6 mr-3 text-primary" /> Pacing Analytics
              </h2>
              <p className="text-muted-foreground">Compare your speed per question against peers.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pacingData.userPacing.length === 0 && (
              <div className="col-span-full p-8 border border-white/5 border-dashed rounded-2xl flex flex-col items-center justify-center text-center">
                <Clock className="w-8 h-8 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">Complete a few practice tests to generate pacing benchmarks.</p>
              </div>
            )}
            {pacingData.userPacing.map(up => {
              // Find matching global average
              const globalBench = pacingData.benchmarks.find((b: any) => 
                (b.subject_id === up.subject_id || (b.subjects && b.subjects.name === up.subject_name)) && 
                b.score_band === 'global_average'
              );
              
              const top10Bench = pacingData.benchmarks.find((b: any) => 
                (b.subject_id === up.subject_id || (b.subjects && b.subjects.name === up.subject_name)) && 
                b.score_band === 'top_10_percent'
              );

              const userAvg = Math.round(up.avg_time);
              const globalAvg = globalBench ? Math.round(globalBench.avg_time_per_question) : null;
              const top10Avg = top10Bench ? Math.round(top10Bench.avg_time_per_question) : null;

              let statusText = "Avg Speed";
              let statusColor = "text-amber-500";
              let bg = "bg-amber-500/10";
              
              if (globalAvg) {
                if (userAvg < globalAvg * 0.8) {
                  statusText = "Fast";
                  statusColor = "text-green-500";
                  bg = "bg-green-500/10";
                } else if (userAvg > globalAvg * 1.2) {
                  statusText = "Slow";
                  statusColor = "text-red-500";
                  bg = "bg-red-500/10";
                }
              }

              return (
                <div key={up.subject_id} className="bg-card shadow-surface p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-bold font-display text-foreground">{up.subject_name}</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${bg} ${statusColor}`}>
                      {statusText}
                    </span>
                  </div>
                  
                  <div className="flex items-end gap-2 mb-6">
                    <span className={`text-4xl font-display font-bold ${statusColor}`}>{userAvg}</span>
                    <span className="text-sm text-muted-foreground mb-1">sec / Q</span>
                  </div>
                  
                  {globalAvg && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs items-center">
                        <span className="text-muted-foreground">Global Avg</span>
                        <span className="text-foreground font-medium">{globalAvg}s</span>
                      </div>
                      <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                        <div className="h-full bg-white/20 relative">
                          <div className={`absolute top-0 bottom-0 ${userAvg <= globalAvg ? 'bg-green-500' : 'bg-red-500'}`} style={{ left: 0, width: `${Math.min(100, (userAvg / globalAvg) * 50)}%` }} />
                          <div className="absolute top-0 bottom-0 w-0.5 bg-primary left-[50%]" />
                        </div>
                      </div>
                      
                      {top10Avg && (
                        <div className="flex justify-between text-xs items-center mt-2 pt-2 border-t border-white/5">
                          <span className="text-muted-foreground text-amber-500">Top 10% Avg</span>
                          <span className="text-amber-500 font-bold">{top10Avg}s</span>
                        </div>
                      )}
                    </div>
                  )}
                  {!globalAvg && <p className="text-xs text-muted-foreground">Not enough global data yet.</p>}
                </div>
              );
            })}
          </div>
        </section>

        {/* Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Weak Topics Section */}
          <div className="bg-card shadow-surface rounded-2xl p-6 flex flex-col">
            <h3 className="text-foreground font-display font-bold text-lg flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-red-400 rotate-180" /> 📉 Topics to Focus On
            </h3>
            
            {weakTopics.length > 0 ? (
              <div className="space-y-4 flex-1">
                {weakTopics.map((w, i) => {
                  const color = w.accuracy < 40 ? "text-red-400" : w.accuracy <= 65 ? "text-amber-400" : "text-green-400";
                  return (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl shadow-surface bg-background shadow-surface">
                      <div>
                        <p className="text-foreground font-medium">{w.topic_name}</p>
                        <p className="text-xs text-muted-foreground/70">{w.subject_name} • {w.attempted} attempted</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`font-bold ${color}`}>{w.accuracy.toFixed(1)}%</span>
                        <Link href={`/practice-tests?topic=${w.topic_slug || ''}`} className="text-xs px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md font-medium transition-colors whitespace-nowrap">
                          Practice Now →
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-xl">
                <p className="text-muted-foreground text-sm">Complete some practice sessions (min 5 attempts per topic) to see your weak areas.</p>
              </div>
            )}
          </div>

          {/* 90-Day Activity Heatmap */}
          <div className="bg-card shadow-surface rounded-2xl p-6">
            <h3 className="text-foreground font-display font-bold text-lg flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-primary" /> Practice Activity
            </h3>
            <div className="shadow-surface p-6 rounded-xl bg-background shadow-surface">
              <ActivityHeatmap heatmapMap={heatmapMap} title="Last 90 Days" />
            </div>
            
            <div className="mt-6 flex items-center justify-between">
              <h3 className="text-foreground font-display font-bold text-lg text-sm">Recent Tests</h3>
              <Link href="/profile?tab=history" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                View All <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div className="mt-4 space-y-2">
              {attempts.slice(0, 3).map(t => (
                 <Link key={t.id as string} href={`/results?attempt_id=${t.id as string}`} className="flex items-center justify-between p-3 rounded-lg shadow-surface hover:bg-white/5 transition-colors">
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">Test {t.mode as string}</p>
                      <p className="text-xs text-muted-foreground/50">{new Date(t.created_at as string).toLocaleDateString()}</p>
                    </div>
                    <span className="text-amber-400 font-bold text-sm">{t.score as number}</span>
                 </Link>
              ))}
              {attempts.length === 0 && <p className="text-xs text-muted-foreground/70">No tests taken yet.</p>}
            </div>
          </div>
        </div>

        {/* Achievements / Badges Section */}
        <div className="bg-card shadow-surface rounded-2xl p-6 mb-8">
          <h3 className="text-foreground font-display font-bold text-lg flex items-center gap-2 mb-6 text-xl">
            🏆 Achievements
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {badges.map(b => (
              <div 
                key={b.id as string} 
                className={`flex flex-col items-center text-center p-4 rounded-xl border transition-all ${
                  b.earned ? "bg-amber-500/10 border-amber-500/30" : "bg-background shadow-surface border-white/5 opacity-60 grayscale"
                }`}
              >
                <div className={`text-4xl mb-3 ${b.earned ? "drop-shadow-[0_0_15px_rgba(255,191,0,0.4)]" : ""}`}>
                  {b.icon as string}
                </div>
                <h4 className={`font-bold text-sm mb-1 ${b.earned ? "text-amber-400" : "text-muted-foreground"}`}>
                  {b.name as string}
                </h4>
                <p className="text-xs text-muted-foreground/70 mb-2 leading-tight min-h-[32px] flex items-center justify-center">
                  {b.desc as string}
                </p>
                <div className="mt-auto text-[10px] font-bold uppercase tracking-wider">
                  {b.earned ? (
                    <span className="text-green-500 flex items-center gap-1">✓ Earned</span>
                  ) : (
                    <span className="text-muted-foreground/50">Locked</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </ProtectedRoute>
  );
}
