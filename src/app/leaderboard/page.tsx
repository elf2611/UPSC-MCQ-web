"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { Trophy, Users, Star, ShieldAlert } from "lucide-react";


export default function LeaderboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const fetchLeaderboard = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/cohorts", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setData(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [user]);

  const joinCohort = async (cohortId: string) => {
    if (!user) return;
    try {
      setLoading(true);
      const token = await user.getIdToken();
      const res = await fetch("/api/cohorts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cohort_id: cohortId })
      });
      if (res.ok) {
        // refresh
        const refRes = await fetch("/api/cohorts", { headers: { Authorization: `Bearer ${token}` } });
        if (refRes.ok) setData(await refRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212]">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto px-4 py-8 lg:py-12 mt-16">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight mb-1">
              {data?.inCohort ? data.membership.cohorts.name : 'Study Cohorts'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {data?.inCohort 
                ? 'Weekly leaderboard based on XP earned from correct answers.'
                : 'Join a target cohort to compete with peers on the same journey.'}
            </p>
          </div>
        </div>

        {!data?.inCohort ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data?.availableCohorts?.map((c: any) => (
              <div key={c.id} className="bg-card shadow-surface p-6 rounded-2xl border border-white/5 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-bold font-display text-foreground">{c.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6 flex-1">
                  Target Exam: {c.target_exam_year}. Join this cohort to benchmark your pacing, accuracy, and consistency against fellow aspirants.
                </p>
                <button 
                  onClick={() => joinCohort(c.id)}
                  className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:scale-[0.98] transition-transform shadow-[0_0_20px_rgba(255,191,0,0.2)]"
                >
                  Join Cohort
                </button>
              </div>
            ))}
            {data?.availableCohorts?.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground p-8 border border-white/10 border-dashed rounded-xl">
                No cohorts available right now.
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card shadow-surface rounded-2xl border border-white/5 overflow-hidden">
            <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex justify-between items-center">
              <h2 className="font-bold text-foreground flex items-center gap-2"><Star className="w-4 h-4 text-amber-400" /> Current Week Top 50</h2>
              {data?.membership.leaderboard_opt_in === false && (
                <span className="text-xs font-bold bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" /> Incognito Mode
                </span>
              )}
            </div>
            <div className="divide-y divide-white/5">
              {data?.leaderboard?.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                  <Trophy className="w-12 h-12 mb-4 opacity-20" />
                  <p>The leaderboard is empty this week.</p>
                  <p className="text-xs mt-2">Practice tests to claim the #1 spot!</p>
                </div>
              ) : (
                data?.leaderboard?.map((row: any, i: number) => {
                  const isMe = row.user_id === user?.uid;
                  return (
                    <div key={row.user_id} className={`flex items-center justify-between p-4 px-6 transition-colors ${isMe ? 'bg-primary/5 relative' : 'hover:bg-white/5'}`}>
                      {isMe && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                      <div className="flex items-center gap-4">
                        <div className={`w-8 font-bold font-display text-lg text-center ${row.rank_position === 1 ? 'text-yellow-400' : row.rank_position === 2 ? 'text-gray-300' : row.rank_position === 3 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          #{row.rank_position || (i + 1)}
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-bold ${isMe ? 'text-primary' : 'text-foreground'}`}>
                            {row.profiles?.name || 'Anonymous User'} {isMe && '(You)'}
                          </span>
                          <span className="text-xs text-muted-foreground">{row.questions_attempted} attempts • {parseFloat(row.accuracy_percent).toFixed(1)}% acc</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display font-bold text-lg text-foreground tabular-nums">
                          {row.xp_earned} <span className="text-sm font-normal text-muted-foreground">XP</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
