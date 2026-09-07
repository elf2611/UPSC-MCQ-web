"use client";

import { useState } from "react";
import { getAuth } from "firebase/auth";

export default function AdminIngestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  
  const [parsedData, setParsedData] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Please select a PDF file.");
    
    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("Must be logged in as admin");
      const token = await user.getIdToken();
      
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("sourceName", sourceName);
      
      const res = await fetch("/api/admin/ingest/parse", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse");
      
      setParsedData(data);
      setStep(2);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("Must be logged in as admin");
      const token = await user.getIdToken();
      
      const payload = {
        mcqs: parsedData.mcqs,
        concepts: parsedData.concepts,
        document_hash: parsedData.document_hash,
        sourceName,
        subject,
        topic
      };
      
      const res = await fetch("/api/admin/ingest/confirm", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm");
      
      setResult(data.report);
      setStep(1);
      setFile(null);
      setParsedData(null);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6">
      <h1 className="text-3xl font-bold text-foreground mb-8">PDF Book Ingestion</h1>
      
      {result && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-bold mb-2">Ingestion Complete</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Total MCQs Detected: {result.total_mcqs_detected}</li>
            <li>Valid / Embedded (RAG): {result.rag_inserted}</li>
            <li>Imported into Practice Bank: {result.practice_inserted}</li>
            <li>Duplicates Skipped: {result.duplicates_skipped}</li>
            <li>Rejected (Low Confidence): {result.rejected}</li>
          </ul>
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleParse} className="bg-card border border-white/10 rounded-2xl p-6 shadow-surface space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Source Document Name</label>
              <input type="text" value={sourceName} onChange={e => setSourceName(e.target.value)} required className="w-full bg-background border border-white/10 rounded-lg px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Subject (Optional)</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-background border border-white/10 rounded-lg px-4 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Topic (Optional)</label>
              <input type="text" value={topic} onChange={e => setTopic(e.target.value)} className="w-full bg-background border border-white/10 rounded-lg px-4 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Upload UPSC PDF Book</label>
            <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} required className="w-full bg-background border border-white/10 rounded-lg px-4 py-2" />
          </div>

          <button type="submit" disabled={loading} className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50">
            {loading ? "Parsing PDF..." : "Extract & Preview Source Questions"}
          </button>
        </form>
      )}

      {step === 2 && parsedData && (
        <div className="space-y-6">
          {parsedData.is_duplicate_pdf && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-4 rounded-lg">
              ⚠️ Warning: A PDF with this exact hash has already been processed. Proceeding may result in duplicates if not caught by text comparison.
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Admin Preview: {parsedData.mcqs.length} Original Source MCQs Found</h2>
            <div className="space-x-4">
              <button onClick={() => setStep(1)} className="px-4 py-2 border border-white/10 rounded-lg hover:bg-white/5">Cancel</button>
              <button onClick={handleConfirm} disabled={loading} className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50">
                {loading ? "Importing Original Questions..." : "Confirm & Import Source Questions"}
              </button>
            </div>
          </div>
          
          <div className="grid gap-4">
            {parsedData.mcqs.slice(0, 10).map((mcq: any, idx: number) => (
              <div key={idx} className="bg-card border border-white/10 p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-primary">Question {mcq.question_number} ({mcq.source_type.toUpperCase()})</span>
                  <span className={`px-2 py-1 text-xs rounded ${mcq.confidence >= 50 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    Confidence: {mcq.confidence}%
                  </span>
                </div>
                <p className="mb-2 text-sm">{mcq.question_text}</p>
                <div className="grid grid-cols-2 gap-2 text-xs mb-2 text-muted-foreground">
                  <div>A: {mcq.option_a}</div>
                  <div>B: {mcq.option_b}</div>
                  <div>C: {mcq.option_c}</div>
                  <div>D: {mcq.option_d}</div>
                </div>
                <div className="text-xs border-t border-white/10 pt-2">
                  <span className="font-bold">Answer:</span> {mcq.correct_option} <br/>
                  <span className="font-bold">Exp:</span> {mcq.explanation.substring(0, 100)}...
                </div>
              </div>
            ))}
            {parsedData.mcqs.length > 10 && (
              <div className="text-center text-muted-foreground p-4">
                ... and {parsedData.mcqs.length - 10} more.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
