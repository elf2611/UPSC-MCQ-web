"use client";

import { useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/protected-route";
import { Download, ChevronLeft, ChevronRight, Activity, Calendar } from "lucide-react";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function LogsPage() {
  const { user } = useAuth();
  
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const queryParams = new URLSearchParams({
    userId: user?.uid || "",
    page: page.toString(),
    type: typeFilter,
    dateFrom: dateFilter
  });

  const { data, error, isLoading } = useSWR(
    user?.uid ? `/api/admin/logs?${queryParams.toString()}` : null,
    fetcher
  );

  const logs = data?.logs || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / 50);

  const downloadCSV = () => {
    if (!logs.length) return;
    const headers = ["Timestamp", "Event Type", "Details"];
    const rows = logs.map((l: Record<string, unknown>) => [
      new Date(l.created_at as string).toLocaleString(),
      l.event_type,
      JSON.stringify(l.details).replace(/"/g, '""')
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map((e: (string | unknown)[]) => `"${e[0]}","${e[1]}","${e[2]}"`).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `system_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ProtectedRoute adminOnly>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Activity className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-white">System Logs</h1>
        </div>

        <div className="bg-card border border-white/10 rounded-xl p-6 shadow-xl flex flex-col min-h-[600px]">
          {/* Filters */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <select 
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
                className="bg-background border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">All Events</option>
                <option value="api_error">API Errors</option>
                <option value="system_log">System Logs</option>
                <option value="upload_started">Upload Started</option>
                <option value="ai_generated">AI Generation</option>
              </select>
              
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input 
                  type="date" 
                  value={dateFilter}
                  onChange={(e) => { setDateFilter(e.target.value); setPage(0); }}
                  className="bg-background border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <button
              onClick={downloadCSV}
              disabled={logs.length === 0}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Download CSV (Current Page)
            </button>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-3 text-sm font-medium text-gray-400 w-48">Timestamp</th>
                  <th className="pb-3 text-sm font-medium text-gray-400 w-40">Event Type</th>
                  <th className="pb-3 text-sm font-medium text-gray-400">Details (JSON)</th>
                </tr>
              </thead>
              <tbody className="text-sm font-mono">
                {isLoading ? (
                  <tr><td colSpan={3} className="py-8 text-center text-gray-500">Loading logs...</td></tr>
                ) : error || data?.error ? (
                  <tr><td colSpan={3} className="py-8 text-center text-red-400">{error?.message || data?.error}</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={3} className="py-8 text-center text-gray-500">No logs found.</td></tr>
                ) : (
                  logs.map((log: Record<string, unknown>) => (
                    <tr key={log.id as string} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 text-gray-400 pr-4 whitespace-nowrap">
                        {new Date(log.created_at as string).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          (log.event_type as string).includes('error') ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {log.event_type as string}
                        </span>
                      </td>
                      <td className="py-3 text-gray-300 pr-4 break-all">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-4">
              <span className="text-sm text-gray-400">
                Showing {page * 50 + 1} to {Math.min((page + 1) * 50, totalCount)} of {totalCount}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-md border border-white/10 text-white disabled:opacity-50 hover:bg-white/5"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-white px-2">Page {page + 1} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-md border border-white/10 text-white disabled:opacity-50 hover:bg-white/5"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
