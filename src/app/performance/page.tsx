"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { TrendingUp, Target, Award, Flame, BookOpen, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";

// ── Demo data ──────────────────────────────────────────────────────────────
const SCORE_TREND = [
  { name: "Test 1", score: 72 }, { name: "Test 2", score: 85 },
  { name: "Test 3", score: 68 }, { name: "Test 4", score: 91 },
  { name: "Test 5", score: 88 }, { name: "Test 6", score: 95 },
  { name: "Test 7", score: 82 }, { name: "Test 8", score: 99 },
  { name: "Test 9", score: 104 }, { name: "Test 10", score: 108 },
];

const RADAR_DATA = [
  { subject: "Polity", accuracy: 82 }, { subject: "History", accuracy: 60 },
  { subject: "Geography", accuracy: 73 }, { subject: "Economy", accuracy: 54 },
  { subject: "Environment", accuracy: 46 }, { subject: "Science", accuracy: 56 },
  { subject: "Curr. Affairs", accuracy: 57 },
];

const WEAK_TOPICS = [
  { topic: "Environment & Ecology", subject: "Environment", accuracy: 38 },
  { topic: "Indian Economy Basics", subject: "Economy", accuracy: 42 },
  { topic: "Medieval History", subject: "History", accuracy: 44 },
  { topic: "Indian Ocean Currents", subject: "Geography", accuracy: 47 },
];

const RECENT_TESTS = [
  { id: "1", name: "Prelims Mock Test 10", date: "2024-06-28", score: 108.3, total: 200, mode: "full" },
  { id: "2", name: "Polity Sectional", date: "2024-06-25", score: 76.5, total: 100, mode: "sectional" },
  { id: "3", name: "Prelims Mock Test 9", date: "2024-06-22", score: 99.0, total: 200, mode: "full" },
  { id: "4", name: "History Practice", date: "2024-06-18", score: 44.0, total: 100, mode: "practice" },
  { id: "5", name: "Prelims Mock Test 8", date: "2024-06-14", score: 82.5, total: 200, mode: "full" },
];

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-extrabold text-white">{value}</p>
        {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function PerformancePage() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (user) {
        const { data } = await supabase
          .from("test_attempts")
          .select("*")
          .eq("user_id", user.uid)
          .order("created_at", { ascending: false })
          .limit(10);
        if (data && data.length > 0) setAttempts(data);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Performance Analytics</h1>
          <p className="text-gray-400 mt-1">Track your growth and identify areas to improve.</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Tests Taken" value="28" sub="across all modes" icon={<Target className="w-5 h-5 text-primary" />} color="bg-primary/10 border-primary/20" />
          <StatCard label="Overall Accuracy" value="68%" sub="+4% vs last month" icon={<TrendingUp className="w-5 h-5 text-green-400" />} color="bg-green-500/10 border-green-500/20" />
          <StatCard label="Average Score" value="94.2" sub="out of 200" icon={<Award className="w-5 h-5 text-purple-400" />} color="bg-purple-500/10 border-purple-500/20" />
          <StatCard label="Current Streak" value="14 Days" sub="Keep it up!" icon={<Flame className="w-5 h-5 text-orange-400" />} color="bg-orange-500/10 border-orange-500/20" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* Score Trend Line Chart */}
          <div className="lg:col-span-2 bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold">Score Trend (Last 10 Tests)</h3>
              <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">↑ Improving</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={SCORE_TREND}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffbf00" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ffbf00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2a2a" />
                  <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} domain={[50, 120]} />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", borderColor: "#374151", color: "#fff", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="score" stroke="#ffbf00" strokeWidth={3} dot={{ fill: "#ffbf00", r: 5, strokeWidth: 2, stroke: "#1a1a1a" }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-4">Subject Mastery</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={RADAR_DATA} cx="50%" cy="50%">
                  <PolarGrid stroke="#2a2a2a" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#6b7280", fontSize: 10 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Accuracy" dataKey="accuracy" stroke="#ffbf00" fill="#ffbf00" fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", borderColor: "#374151", color: "#fff", borderRadius: "8px" }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Weak Topics */}
          <div className="lg:col-span-2 bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
            <h3 className="text-white font-semibold mb-5">Weak Topics</h3>
            <div className="space-y-4">
              {WEAK_TOPICS.map((t, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-background rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-300 truncate">{t.topic}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${t.accuracy}%` }} />
                      </div>
                      <span className="text-xs text-red-400 font-semibold flex-shrink-0">{t.accuracy}%</span>
                    </div>
                  </div>
                  <Link
                    href={`/practice-tests?subject=${t.subject}&topic=${t.topic}`}
                    className="flex-shrink-0 text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 bg-primary/10 px-2.5 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/20 transition-colors"
                  >
                    Practice <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Tests Table */}
          <div className="lg:col-span-3 bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Recent Tests</h3>
              <Link href="/profile?tab=history" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                View All <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left text-xs text-gray-500 font-semibold pb-3 pr-4">Test</th>
                    <th className="text-left text-xs text-gray-500 font-semibold pb-3 pr-4">Date</th>
                    <th className="text-center text-xs text-gray-500 font-semibold pb-3 pr-4">Score</th>
                    <th className="text-center text-xs text-gray-500 font-semibold pb-3 pr-4">%</th>
                    <th className="text-right text-xs text-gray-500 font-semibold pb-3">Report</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {RECENT_TESTS.map(t => {
                    const pct = Math.round((t.score / t.total) * 100);
                    return (
                      <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 pr-4">
                          <p className="text-gray-300 font-medium truncate max-w-[160px]">{t.name}</p>
                          <p className="text-xs text-gray-600 capitalize">{t.mode}</p>
                        </td>
                        <td className="py-3.5 pr-4 text-gray-400 text-xs whitespace-nowrap">{t.date}</td>
                        <td className="py-3.5 pr-4 text-center">
                          <span className={`font-bold ${t.score >= 100 ? "text-green-400" : t.score >= 80 ? "text-amber-400" : "text-red-400"}`}>{t.score}</span>
                        </td>
                        <td className="py-3.5 pr-4 text-center">
                          <span className="text-xs text-gray-500">{pct}%</span>
                        </td>
                        <td className="py-3.5 text-right">
                          <Link href={`/results?attempt_id=${t.id}`} className="text-xs text-primary hover:text-primary/80 underline underline-offset-2">View</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </ProtectedRoute>
  );
}
