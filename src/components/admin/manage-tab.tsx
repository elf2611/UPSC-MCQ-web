"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { useAuth } from "@/hooks/useAuth";
import { Search, Pencil, Trash2, ChevronLeft, ChevronRight, History, Download, Upload } from "lucide-react";
import { HistoryModal } from "./history-modal";
import { ImportModal } from "./import-modal";

export function ManageTab({ onEdit }: { onEdit: (q: Record<string, unknown>) => void }) {
  const { user } = useAuth();
  
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [page, setPage] = useState(0);
  const [historyQuestionId, setHistoryQuestionId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | "json" | null>(null);

  const fetcher = async (url: string) => {
    const token = await user?.getIdToken();
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      const err = new Error("Failed to fetch data");
      (err as Error & { status?: number }).status = res.status;
      throw err;
    }
    return res.json();
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(0); // Reset page on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const queryParams = new URLSearchParams({
    userId: user?.uid || "",
    page: page.toString(),
    search: debouncedSearch,
    difficulty: difficulty
  });

  const { data, error, isLoading, mutate } = useSWR(
    user?.uid ? `/api/admin/search-questions?${queryParams.toString()}` : null,
    fetcher
  );

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this question?")) {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/admin/questions?id=${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        alert("Failed to delete question: " + (errorData.error || res.statusText));
      } else {
        mutate();
      }
    }
  };

  const handleExport = async (format: "csv" | "xlsx" | "json") => {
    setExporting(format);
    try {
      const url = new URL("/api/admin/export", window.location.origin);
      url.searchParams.set("userId", user?.uid || "");
      url.searchParams.set("format", format);
      if (debouncedSearch) url.searchParams.set("q", debouncedSearch); // We'd need API support for 'q', let's stick to base filters
      url.searchParams.set("difficulty", difficulty);
      
      const token = await user?.getIdToken();
      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error(await res.text());

      // Trigger download
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `prepwise_questions_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: unknown) {
      alert("Failed to export: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setExporting(null);
    }
  };

  const questions = data?.questions || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / 50);

  return (
    <div className="bg-card border border-white/10 rounded-xl p-6 shadow-xl flex flex-col min-h-[600px]">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold text-white">Question Bank ({totalCount})</h2>
        
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
          <select 
            value={difficulty}
            onChange={(e) => { setDifficulty(e.target.value); setPage(0); }}
            className="bg-background border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input 
              type="text" 
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Full-text search (tsvector)..."
              className="w-full bg-background border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => setShowImport(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex-1 md:flex-none whitespace-nowrap"
            >
              <Upload className="w-4 h-4" /> Import
            </button>
            
            <div className="relative group">
              <button 
                disabled={!!exporting}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg transition-colors w-full md:w-auto whitespace-nowrap disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> 
                {exporting ? "Exporting..." : "Export"}
              </button>
              
              <div className="absolute right-0 top-full mt-2 w-32 bg-card border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 flex flex-col overflow-hidden">
                <button onClick={() => handleExport("csv")} className="px-4 py-2 text-left text-sm text-gray-300 hover:text-white hover:bg-white/10">CSV</button>
                <button onClick={() => handleExport("xlsx")} className="px-4 py-2 text-left text-sm text-gray-300 hover:text-white hover:bg-white/10">Excel (.xlsx)</button>
                <button onClick={() => handleExport("json")} className="px-4 py-2 text-left text-sm text-gray-300 hover:text-white hover:bg-white/10">JSON</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="pb-3 text-sm font-medium text-gray-400">Subject</th>
              <th className="pb-3 text-sm font-medium text-gray-400">Topic</th>
              <th className="pb-3 text-sm font-medium text-gray-400">Question</th>
              <th className="pb-3 text-sm font-medium text-gray-400">Diff</th>
              <th className="pb-3 text-sm font-medium text-gray-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {isLoading ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-500">Loading questions via FTS...</td></tr>
            ) : error || data?.error ? (
              <tr><td colSpan={5} className="py-8 text-center text-red-400">{error?.message || data?.error}</td></tr>
            ) : questions.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-gray-500">No questions found.</td></tr>
            ) : (
              questions.map((q: Record<string, unknown>) => (
                <tr key={q.id as string} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 text-gray-300 pr-4">{q.subject as string}</td>
                  <td className="py-3 text-gray-300 pr-4">{q.topic as string}</td>
                  <td className="py-3 text-gray-300 pr-4">
                    <div className="max-w-md truncate">{q.question_text as string}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-1 rounded-full text-xs capitalize ${
                      q.difficulty === 'easy' ? 'bg-green-500/10 text-green-400' :
                      q.difficulty === 'medium' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {q.difficulty as string}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => onEdit(q)}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setHistoryQuestionId(q.id as string)}
                        className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-500/20 rounded-md transition-colors"
                        title="View History"
                      >
                        <History className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(q.id as string)}
                        className="p-1.5 text-red-400 hover:text-white hover:bg-red-500 rounded-md transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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

      {historyQuestionId && (
        <HistoryModal 
          questionId={historyQuestionId}
          onClose={() => setHistoryQuestionId(null)}
          onRestored={() => mutate()}
        />
      )}

      {showImport && (
        <ImportModal 
          onClose={() => setShowImport(false)}
          onImported={() => {
            // Ideally navigate to staging area or just show alert
            alert("Questions imported to Staging Area successfully!");
          }}
        />
      )}
    </div>
  );
}
