"use client";

import { useState } from "react";
import { getAuth } from "firebase/auth";

export default function MentorChat() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");
      
      const token = await user.getIdToken();
      
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: userMsg,
          history: messages 
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get reply");

      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-card border border-white/10 rounded-2xl overflow-hidden shadow-surface">
      <div className="bg-primary/10 p-4 border-b border-white/10 flex items-center">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-primary-foreground mr-4 shadow-[0_0_15px_rgba(255,191,0,0.3)]">AI</div>
        <div>
          <h2 className="font-bold font-display text-foreground">Prepwise AI Mentor</h2>
          <p className="text-xs text-muted-foreground">Ask me about your weak subjects, or any UPSC doubt.</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground mt-20">
            <p>Hi! I&apos;m your AI Mentor.</p>
            <p className="text-sm mt-2">Try asking: &quot;What are my weakest topics?&quot;</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl px-4 py-2 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-white/5 border border-white/10 text-foreground'}`}>
              <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 text-muted-foreground rounded-xl px-4 py-2 text-sm animate-pulse">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t border-white/10 bg-background/50">
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            className="flex-1 bg-background border border-white/10 rounded-lg px-4 py-2 text-foreground focus:border-primary outline-none"
            placeholder="Ask your mentor..."
          />
          <button 
            type="submit" 
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
