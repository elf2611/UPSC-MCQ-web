"use client";

import { useState, useEffect } from "react";
import { History, Undo, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export function HistoryModal({ questionId, onClose, onRestored }: { questionId: string, onClose: () => void, onRestored: () => void }) {
  const { user } = useAuth();
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const token = await user?.getIdToken();
        const res = await fetch(`/api/admin/question-history?questionId=${questionId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load history");
        setHistory(data.history || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [questionId]);

  const handleRestore = async (historyId: string) => {
    if (!confirm("Are you sure you want to restore this version? The current version will be saved in history.")) return;
    setRestoringId(historyId);
    setError("");
    
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/restore-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ historyId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      onRestored();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-white/10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><History className="w-5 h-5 text-primary" /> Version History</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {error && <div className="p-3 bg-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>}
          
          {loading ? (
            <div className="flex justify-center py-8 text-gray-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No previous versions found for this question.</div>
          ) : (
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
              {history.map((h) => (
                <div key={h.id as string} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-background shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <History className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white/5 p-4 rounded-lg border border-white/10">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs text-gray-400 font-mono">{new Date(h.edited_at as string).toLocaleString()}</span>
                      <button 
                        onClick={() => handleRestore(h.id as string)}
                        disabled={!!restoringId}
                        className="flex items-center gap-1 text-xs bg-primary/20 text-primary hover:bg-primary/40 px-2 py-1 rounded transition-colors disabled:opacity-50"
                        title="Restore this version"
                      >
                        {restoringId === h.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo className="w-3 h-3" />} Restore
                      </button>
                    </div>
                    <p className="text-sm text-gray-300">Edited by {(h.profiles as Record<string, string>)?.email || 'Unknown Admin'}</p>
                    <details className="mt-2 text-xs">
                      <summary className="text-gray-500 cursor-pointer hover:text-gray-300">View Data</summary>
                      <pre className="mt-2 p-2 bg-black/50 rounded overflow-x-auto text-gray-400 max-h-40">
                        {JSON.stringify(h.previous_data, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
