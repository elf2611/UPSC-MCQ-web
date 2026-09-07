"use client";

import { useState } from "react";
import { getAuth } from "firebase/auth";

export default function AdminIngestPage() {
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must be logged in as admin");
      }
      
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ content, source, subject, topic })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to ingest");
      }

      setResult(`Success! Processed ${data.chunksProcessed} chunks.`);
      setContent("");
    } catch (err: any) {
      setResult(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      <h1 className="text-3xl font-bold font-display text-foreground mb-8">Knowledge Base Ingestion</h1>
      
      <div className="bg-card border border-white/10 rounded-2xl p-6 shadow-surface">
        <form onSubmit={handleIngest} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Source (e.g. NCERT Class 11)</label>
              <input 
                type="text" 
                value={source}
                onChange={e => setSource(e.target.value)}
                className="w-full bg-background border border-white/10 rounded-lg px-4 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Subject (e.g. Polity)</label>
              <input 
                type="text" 
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-background border border-white/10 rounded-lg px-4 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Topic (e.g. Fundamental Rights)</label>
              <input 
                type="text" 
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="w-full bg-background border border-white/10 rounded-lg px-4 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Content (Paste text to chunk and embed)</label>
            <textarea 
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full h-64 bg-background border border-white/10 rounded-lg px-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none font-mono text-sm resize-y"
              placeholder="Paste UPSC study material here..."
              required
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <p className="text-sm text-muted-foreground">
              Note: This will call Gemini Embedding API and store vectors in Supabase.
            </p>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Processing..." : "Ingest Document"}
            </button>
          </div>
        </form>

        {result && (
          <div className={`mt-6 p-4 rounded-lg border ${result.startsWith('Error') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
