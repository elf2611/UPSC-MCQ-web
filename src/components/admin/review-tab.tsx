"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, X, Pencil, Trash2, Loader2, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type StagedQuestion = Record<string, any>;

export function ReviewTab() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<StagedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<StagedQuestion | null>(null);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/admin/staged-questions?status=pending", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to fetch staged questions");
      setQuestions(result.data || []);
      setSelectedIds(new Set());
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === questions.length && questions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map((q) => q.id)));
    }
  };

  const handleApprove = async (idsToApprove: string[], customData?: StagedQuestion) => {
    setProcessing(true);
    try {
      const token = await user?.getIdToken();
      const payload = idsToApprove.map(id => {
        if (customData && customData.id === id) return customData;
        return questions.find(q => q.id === id);
      }).filter(Boolean);

      const res = await fetch("/api/admin/staged-questions/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ questions: payload }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to approve");
      setEditingId(null);
      await fetchQuestions();
    } catch (err: any) {
      alert("Approval failed: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (idsToReject: string[]) => {
    if (!window.confirm(`Are you sure you want to reject ${idsToReject.length} question(s)?`)) return;
    setProcessing(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/admin/staged-questions/reject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ids: idsToReject }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to reject");
      await fetchQuestions();
    } catch (err: any) {
      alert("Rejection failed: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading staged questions...</div>;
  }

  if (errorMsg) {
    return <div className="p-8 text-center text-red-400">Error: {errorMsg}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-white/10">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.size === questions.length && questions.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-600 bg-background text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-300">Select All ({selectedIds.size})</span>
          </label>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleReject(Array.from(selectedIds))}
            disabled={selectedIds.size === 0 || processing}
            className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Reject Selected
          </button>
          <button
            onClick={() => handleApprove(Array.from(selectedIds))}
            disabled={selectedIds.size === 0 || processing}
            className="px-4 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Approve Selected
          </button>
        </div>
      </div>

      {questions.length === 0 ? (
        <div className="p-12 text-center bg-card border border-white/10 rounded-xl text-gray-400">
          No pending questions to review.
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => {
            const isEditing = editingId === q.id;
            const data = isEditing && editFormData ? editFormData : q;

            return (
              <div key={q.id} className="bg-card border border-white/10 rounded-xl p-5 flex gap-4 transition-colors hover:bg-white/[0.02]">
                <div className="pt-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(q.id)}
                    onChange={() => toggleSelect(q.id)}
                    className="w-4 h-4 rounded border-gray-600 bg-background text-primary focus:ring-primary"
                  />
                </div>
                <div className="flex-1 space-y-4">
                  {isEditing ? (
                    <div className="space-y-4">
                      <textarea
                        value={data.question_text}
                        onChange={(e) => setEditFormData({ ...data, question_text: e.target.value })}
                        className="w-full bg-background border border-white/10 rounded-lg p-3 text-white"
                        rows={3}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        {(['a', 'b', 'c', 'd'] as const).map(opt => (
                          <div key={opt} className={`p-2 rounded border ${data.correct_option === opt ? 'border-green-500/50' : 'border-white/10'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <input 
                                type="radio" 
                                name={`correct_${q.id}`} 
                                checked={data.correct_option === opt}
                                onChange={() => setEditFormData({ ...data, correct_option: opt })}
                              />
                              <span className="text-xs uppercase font-bold text-gray-400">Option {opt}</span>
                            </div>
                            <textarea
                              value={data[`option_${opt}`]}
                              onChange={(e) => setEditFormData({ ...data, [`option_${opt}`]: e.target.value })}
                              className="w-full bg-background/50 border border-white/10 rounded p-1 text-sm text-white"
                              rows={2}
                            />
                            {data.correct_option !== opt && (
                              <input 
                                type="text"
                                placeholder={`Why is ${opt} wrong?`}
                                value={data[`why_${opt}_wrong`] || ''}
                                onChange={(e) => setEditFormData({ ...data, [`why_${opt}_wrong`]: e.target.value })}
                                className="w-full mt-1 bg-background/50 border border-white/10 rounded p-1 text-xs text-gray-400"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                      <div>
                        <span className="text-xs text-gray-400 block mb-1">Explanation</span>
                        <textarea
                          value={data.explanation}
                          onChange={(e) => setEditFormData({ ...data, explanation: e.target.value })}
                          className="w-full bg-background border border-white/10 rounded-lg p-3 text-sm text-gray-300"
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                         <input type="text" value={data.subject || ''} onChange={e => setEditFormData({...data, subject: e.target.value})} placeholder="Subject" className="bg-background border border-white/10 rounded p-1 text-sm text-white" />
                         <input type="text" value={data.topic || ''} onChange={e => setEditFormData({...data, topic: e.target.value})} placeholder="Topic" className="bg-background border border-white/10 rounded p-1 text-sm text-white" />
                         <input type="text" value={data.subtopic || ''} onChange={e => setEditFormData({...data, subtopic: e.target.value})} placeholder="Subtopic" className="bg-background border border-white/10 rounded p-1 text-sm text-white" />
                         <input type="date" value={data.article_date || ''} onChange={e => setEditFormData({...data, article_date: e.target.value})} className="bg-background border border-white/10 rounded p-1 text-sm text-gray-400" />
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setEditingId(null)} className="px-4 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
                        <button onClick={() => handleApprove([q.id], data)} className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded text-sm flex items-center gap-2">
                          <Check className="w-4 h-4" /> Save & Approve
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="text-lg text-gray-200 mb-2">{q.question_text}</p>
                          <div className="flex gap-2 text-xs mb-4">
                            <span className="px-2 py-1 bg-white/5 rounded text-gray-400">{q.subject} {q.topic ? `› ${q.topic}` : ''} {q.subtopic ? `› ${q.subtopic}` : ''}</span>
                            <span className="px-2 py-1 bg-white/5 rounded text-gray-400">Source: {q.source} {q.article_date && `(${q.article_date})`}</span>
                            <span className="px-2 py-1 bg-white/5 rounded text-gray-400">Diff: {q.difficulty}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          <button onClick={() => handleApprove([q.id])} disabled={processing} className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded text-xs flex items-center justify-center gap-1 transition-colors">
                            <Check className="w-3 h-3" /> Approve
                          </button>
                          <button onClick={() => { setEditingId(q.id); setEditFormData(q); }} disabled={processing} className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded text-xs flex items-center justify-center gap-1 transition-colors">
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                          <button onClick={() => handleReject([q.id])} disabled={processing} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded text-xs flex items-center justify-center gap-1 transition-colors">
                            <X className="w-3 h-3" /> Reject
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {(['a', 'b', 'c', 'd'] as const).map(opt => {
                          const isCorrect = q.correct_option?.toLowerCase() === opt;
                          return (
                            <div key={opt} className={`p-2 rounded border ${isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
                              <span className={`font-bold mr-2 ${isCorrect ? 'text-green-400' : 'text-gray-500'}`}>{opt.toUpperCase()}.</span>
                              <span className="text-gray-300">{q[`option_${opt}`]}</span>
                              {!isCorrect && q[`why_${opt}_wrong`] && (
                                <p className="text-xs text-gray-500 mt-1 italic">{q[`why_${opt}_wrong`]}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {q.explanation && (
                        <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/5">
                          <span className="text-xs font-bold text-gray-400 uppercase mb-1 block">Explanation</span>
                          <p className="text-sm text-gray-300">{q.explanation}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
