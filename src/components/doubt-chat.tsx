"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function DoubtChatWidget({ questionId }: { questionId?: string }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Get Firebase ID token
      // Assuming a global auth context or similar, we need to pass the token.
      // For this widget, we'll try to fetch it if available, or assume standard cookie/header.
      // Wait, firebase auth tokens are usually stored in localStorage or handled via onIdTokenChanged.
      // Let's assume we can fetch it or it's handled by middleware. 
      // If client-side, we might need firebase/auth.
      if (!user) return;
      const idToken = await user.getIdToken(); // In prepwise, they probably have a hook like `useAuth().getIdToken()`

      const res = await fetch('/api/doubts/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          threadId,
          message: userMessage,
          questionId
        })
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `Error: ${err.error || 'Failed to get response.'}` }]);
        setIsLoading(false);
        return;
      }

      // Read SSE stream
      const returnedThreadId = res.headers.get('X-Thread-Id');
      if (returnedThreadId && !threadId) {
        setThreadId(returnedThreadId);
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      const assistantMsgId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: "" }]);

      if (reader) {
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.substring(6));
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  fullText += text;
                  setMessages(prev => 
                    prev.map(m => m.id === assistantMsgId ? { ...m, content: fullText } : m)
                  );
                }
              } catch (_e) {
                // ignore
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Network error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-transform z-50"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[380px] h-[600px] max-h-[80vh] bg-card border border-white/10 shadow-2xl rounded-2xl flex flex-col z-50 overflow-hidden animate-[slideUp_0.3s_ease-out]">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-background/50">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold font-display text-foreground">AI Faculty Chat</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                <Bot className="w-12 h-12 mb-4 opacity-50" />
                <p>Have a doubt? Ask me anything about this question or UPSC prep.</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-white/5 border border-white/5 text-foreground rounded-tl-sm'}`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/5 text-foreground rounded-2xl rounded-tl-sm p-3 text-sm flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10 bg-background/50">
            <form onSubmit={handleSubmit} className="flex items-center space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your doubt..."
                className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                disabled={isLoading}
              />
              <button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
