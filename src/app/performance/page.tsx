"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import { TrendingUp, Award, Flame, ExternalLink, Activity, Target as TargetIcon } from "lucide-react";
import Link from "next/link";
import { ActivityHeatmap } from "@/components/ui/ActivityHeatmap";

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
    <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-5 flex flex-col justify-between">
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium mb-0.5">{label}</p>
          <p className="text-2xl font-extrabold text-white">{value}</p>
          {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
        </div>
      </div>
      {progress && (
        <div className="mt-4">
          <div className="h-1.5 bg-background rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${Math.min(100, (progress.current / progress.max) * 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-500 text-right mt-1 font-medium">{progress.current} / {progress.max} XP</div>
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function PerformancePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [attempts, setAttempts] = useState<Record<string, unknown>[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [totalPracticed, setTotalPracticed] = useState(0);
  const [overallAccuracy, setOverallAccuracy] = useState(0);
  const [heatmapMap, setHeatmapMap] = useState<Record<string, number>>({});
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>([]);
  const [badges, setBadges] = useState<BadgeDef[]>(ALL_BADGES);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      // 1. Fetch Profile
      const { data: pData } = await supabase.from("profiles").select("xp, level, streak_count").eq("id", user.uid).single();
      if (pData) setProfile(pData);

      // 2. Fetch Total Practiced & Heatmap
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const ninetyStr = ninetyDaysAgo.toISOString().split("T")[0];

      const { data: hData, count } = await supabase
        .from("question_attempts")
        .select("attempt_date", { count: 'exact' })
        .eq("user_id", user.uid);
      
      setTotalPracticed(count || 0);

      if (hData) {
        const counts: Record<string, number> = {};
        hData.forEach(row => {
          if (row.attempt_date >= ninetyStr) {
            counts[row.attempt_date] = (counts[row.attempt_date] || 0) + 1;
          }
        });
        setHeatmapMap(counts);
      }

      // 3. Fetch Subject Level Stats (Accuracy & Radar)
      const { data: statData } = await supabase
        .from("user_statistics")
        .select("total_attempted, total_correct")
        .eq("user_id", user.uid)
        .is("topic_id", null);

      if (statData && statData.length > 0) {
        const tAttempted = statData.reduce((acc, row) => acc + row.total_attempted, 0);
        const tCorrect = statData.reduce((acc, row) => acc + row.total_correct, 0);
        setOverallAccuracy(tAttempted > 0 ? Math.round((tCorrect / tAttempted) * 100) : 0);
      }

      // 4. Fetch Weak Topics
      const { data: weakData } = await supabase
        .from("user_statistics")
        .select("accuracy_percent, total_attempted, topics(name, slug), subjects(name, slug)")
        .eq("user_id", user.uid)
        .not("topic_id", "is", null)
        .gte("total_attempted", 5)
        .order("accuracy_percent", { ascending: true })
        .limit(5);

      if (weakData) {
        setWeakTopics(weakData.map(w => ({
          topic_name: (w.topics as { name?: string })?.name || "Unknown Topic",
          topic_slug: (w.topics as { slug?: string })?.slug || "",
          subject_name: (w.subjects as { name?: string })?.name || "Unknown Subject",
          subject_slug: (w.subjects as { slug?: string })?.slug || "",
          accuracy: Number(w.accuracy_percent),
          attempted: Number(w.total_attempted)
        })));
      }

      // 5. Fetch Badges
      const { data: badgeData } = await supabase
        .from("achievements")
        .select("badge_name, earned_at")
        .eq("user_id", user.uid);

      if (badgeData) {
        const earnedMap = new Map(badgeData.map(b => [b.badge_name, b.earned_at]));
        const mergedBadges = ALL_BADGES.map(b => ({
          ...b,
          earned: earnedMap.has(b.name),
          earnedAt: earnedMap.get(b.name)
        }));
        setBadges(mergedBadges);
      }

      // 6. Recent Tests
      const { data: testData } = await supabase
        .from("test_attempts")
        .select("*")
        .eq("user_id", user.uid)
        .order("created_at", { ascending: false })
        .limit(10);
      if (testData) setAttempts(testData);

      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212]">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const lvlIdx = (profile?.level || 1) - 1;
  const levelName = LEVEL_NAMES[lvlIdx] || `Level ${profile?.level}`;
  const nextThreshold = THRESHOLDS[lvlIdx + 1] || THRESHOLDS[THRESHOLDS.length - 1];

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 py-8 lg:py-12 mt-16">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Performance Analytics</h1>
          <p className="text-gray-400 mt-1">Track your growth and identify areas to improve.</p>
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
          <div className="lg:col-span-2 bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold">Score Trend (Last 10 Tests)</h3>
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
                    <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", borderColor: "#374151", color: "#fff", borderRadius: "8px" }} />
                    <Line type="monotone" dataKey="score" stroke="#ffbf00" strokeWidth={3} dot={{ fill: "#ffbf00", r: 5, strokeWidth: 2, stroke: "#1a1a1a" }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">Take some tests to see your trend</div>
              )}
            </div>
          </div>

          {/* Radar Chart (Subject Mastery placeholder for now since we don't have aggregated subject radar data easily available, keeping existing UI structure) */}
          <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Subject Mastery</h3>
            <div className="h-64 flex items-center justify-center text-sm text-gray-500 border border-dashed border-white/10 rounded-xl">
              Complete subject-specific tests to unlock radar chart.
            </div>
          </div>
        </div>

        {/* Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* Weak Topics Section */}
          <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 flex flex-col">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-red-400 rotate-180" /> 📉 Topics to Focus On
            </h3>
            
            {weakTopics.length > 0 ? (
              <div className="space-y-4 flex-1">
                {weakTopics.map((w, i) => {
                  const color = w.accuracy < 40 ? "text-red-400" : w.accuracy <= 65 ? "text-amber-400" : "text-green-400";
                  return (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-white/5 bg-background">
                      <div>
                        <p className="text-white font-medium">{w.topic_name}</p>
                        <p className="text-xs text-gray-500">{w.subject_name} • {w.attempted} attempted</p>
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
                <p className="text-gray-400 text-sm">Complete some practice sessions (min 5 attempts per topic) to see your weak areas.</p>
              </div>
            )}
          </div>

          {/* 90-Day Activity Heatmap */}
          <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-primary" /> Practice Activity
            </h3>
            <div className="border border-white/5 p-6 rounded-xl bg-background">
              <ActivityHeatmap heatmapMap={heatmapMap} title="Last 90 Days" />
            </div>
            
            <div className="mt-6 flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">Recent Tests</h3>
              <Link href="/profile?tab=history" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                View All <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div className="mt-4 space-y-2">
              {attempts.slice(0, 3).map(t => (
                 <Link key={t.id as string} href={`/results?attempt_id=${t.id as string}`} className="flex items-center justify-between p-3 rounded-lg border border-white/5 hover:bg-white/5 transition-colors">
                    <div>
                      <p className="text-gray-300 text-sm font-medium">Test {t.mode as string}</p>
                      <p className="text-xs text-gray-600">{new Date(t.created_at as string).toLocaleDateString()}</p>
                    </div>
                    <span className="text-amber-400 font-bold text-sm">{t.score as number}</span>
                 </Link>
              ))}
              {attempts.length === 0 && <p className="text-xs text-gray-500">No tests taken yet.</p>}
            </div>
          </div>
        </div>

        {/* Achievements / Badges Section */}
        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 mb-8">
          <h3 className="text-white font-semibold flex items-center gap-2 mb-6 text-xl">
            🏆 Achievements
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {badges.map(b => (
              <div 
                key={b.id as string} 
                className={`flex flex-col items-center text-center p-4 rounded-xl border transition-all ${
                  b.earned ? "bg-amber-500/10 border-amber-500/30" : "bg-background border-white/5 opacity-60 grayscale"
                }`}
              >
                <div className={`text-4xl mb-3 ${b.earned ? "drop-shadow-[0_0_15px_rgba(255,191,0,0.4)]" : ""}`}>
                  {b.icon as string}
                </div>
                <h4 className={`font-bold text-sm mb-1 ${b.earned ? "text-amber-400" : "text-gray-400"}`}>
                  {b.name as string}
                </h4>
                <p className="text-xs text-gray-500 mb-2 leading-tight min-h-[32px] flex items-center justify-center">
                  {b.desc as string}
                </p>
                <div className="mt-auto text-[10px] font-bold uppercase tracking-wider">
                  {b.earned ? (
                    <span className="text-green-500 flex items-center gap-1">✓ Earned</span>
                  ) : (
                    <span className="text-gray-600">Locked</span>
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
