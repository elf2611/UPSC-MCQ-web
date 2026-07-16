"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { Activity, BookOpen, Brain, Clock, Database, Layers } from "lucide-react";

export function DashboardTab() {
  const { user } = useAuth();
  const [failures, setFailures] = useState(0);
  const [isFocused, setIsFocused] = useState(true);

  useEffect(() => {
    const onFocus = () => setIsFocused(true);
    const onBlur = () => setIsFocused(false);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const fetcher = async (url: string) => {
    const token = await user?.getIdToken();
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      const err = new Error("Failed to fetch dashboard");
      (err as any).status = res.status;
      throw err;
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  };
  
  // Poll only if focused and failures < 3
  const shouldPoll = isFocused && failures < 3;
  const { data, error, isLoading } = useSWR(
    user?.uid ? `/api/admin/dashboard?userId=${user.uid}` : null, 
    fetcher, 
    { 
      refreshInterval: shouldPoll ? 10000 : 0,
      onError: (err) => {
        if ((err as any).status === 401 || (err as any).status === 403) {
          setFailures(prev => prev + 1);
        }
      },
      onSuccess: () => setFailures(0),
      revalidateOnFocus: false // handled by our own focus listener/refreshInterval
    }
  );

  if (isLoading) return <div className="text-white py-10">Loading Dashboard Stats...</div>;
  if (error) return <div className="text-red-400 py-10">Failed to load dashboard: {error.message}</div>;

  const stats = data || {};

  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={<Database className="text-blue-400" />} label="Total Questions" value={stats.totalQuestions} />
        <StatCard icon={<BookOpen className="text-indigo-400" />} label="Subjects / Topics" value={`${stats.totalSubjects} / ${stats.totalTopics}`} />
        <StatCard icon={<Layers className="text-purple-400" />} label="Today's Uploads" value={stats.todayUploads} />
        <StatCard icon={<Activity className="text-emerald-400" />} label="Active Jobs" value={stats.activeJobs?.length || 0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <div className="bg-card border border-white/10 rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" /> AI Pipeline Performance (30 Days)
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
              <span className="text-gray-300">Success Rate</span>
              <span className={`font-bold ${stats.successRate > 90 ? 'text-green-400' : 'text-amber-400'}`}>
                {stats.successRate}%
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
              <span className="text-gray-300">Avg. Chunk Processing Time</span>
              <span className="font-bold text-white flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-400" /> {stats.avgProcessingTimeSec}s
              </span>
            </div>
          </div>
        </div>

        {/* Recent Uploads */}
        <div className="bg-card border border-white/10 rounded-xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Uploads</h2>
          <div className="space-y-2">
            {stats.recentUploads?.length === 0 ? (
              <div className="text-gray-500 text-sm">No recent uploads.</div>
            ) : (
              stats.recentUploads?.slice(0, 5).map((job: Record<string, unknown>) => (
                <div key={job.id as string} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-200 truncate w-48">{(job.source_file as string).split('/').pop()}</span>
                    <span className="text-xs text-gray-500">{new Date(job.created_at as string).toLocaleString()}</span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    job.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {job.status as string}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-card border border-white/10 rounded-xl p-5 shadow-lg flex items-center gap-4">
      <div className="p-3 bg-white/5 rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}
