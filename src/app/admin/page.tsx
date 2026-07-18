"use client";

import { useState, useEffect, useCallback } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { PlusCircle, List, Pencil, Trash2, Brain, BookOpen, Save, CheckCircle2, LayoutDashboard } from "lucide-react";
import { PdfUploader } from "@/components/pdf-uploader";
import { DashboardTab } from "@/components/admin/dashboard-tab";
import { ManageTab } from "@/components/admin/manage-tab";
import { useAuth } from "@/hooks/useAuth";
import { QuestionForm, QuestionFormValues } from "@/components/admin/question-form";

import { ErrorBoundary } from "@/components/error-boundary";

function AdminInner() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "add" | "manage" | "subjects" | "generator">("dashboard");
  const [editingQuestion, setEditingQuestion] = useState<QuestionFormValues | null>(null);
  const { user } = useAuth();

  // Subjects & Topics State
  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [topics, setTopics] = useState<Record<string, unknown>[]>([]);
  const [subtopics, setSubtopics] = useState<Record<string, unknown>[]>([]);
  const [newSubName, setNewSubName] = useState("");
  const [newSubColor, setNewSubColor] = useState("#6366f1");
  const [newSubIcon, setNewSubIcon] = useState("📚");
  const [addingTopicTo, setAddingTopicTo] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState("");
  const [addingSubtopicTo, setAddingSubtopicTo] = useState<string | null>(null);
  const [newSubtopicName, setNewSubtopicName] = useState("");

  // AI Generator State
  const [importMethod, setImportMethod] = useState<"pdf" | "json" | "text">("pdf");
  const [jsonText, setJsonText] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [aiSourceText, setAiSourceText] = useState("");
  const [aiExtractedContext, setAiExtractedContext] = useState("");
  
  const [aiConfig, setAiConfig] = useState({
    count: 5,
    difficulty: "Mixed",
    upscLevel: "Prelims",
    subject: "Current Affairs",
    topic: "",
    language: "English",
    explanationLength: "Medium",
    includeEliminationTips: true,
    autoGenerateTags: true,
    source: "Current Affairs"
  });
  
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<Record<string, unknown>[]>([]);

  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [errorStr, setErrorStr] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchSubjectsAndTopics = useCallback(async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/subjects-topics", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setSubjects(data.subjects || []);
        setTopics(data.topics || []);
        setSubtopics(data.subtopics || []);
      }
    } catch (e) {
      console.error("Failed to fetch taxonomy", e);
    }
  }, [user]);

  useEffect(() => {
    fetchSubjectsAndTopics();
  }, [fetchSubjectsAndTopics]);

  const fetchSubjects = fetchSubjectsAndTopics; // Alias for consistency
  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setActiveTab("manage");
  };
  // --- Subjects Handlers ---
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = newSubName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const token = await user?.getIdToken();
    const res = await fetch('/api/admin/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ name: newSubName, slug, color: newSubColor, icon: newSubIcon })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      alert("Failed to add subject: " + (errorData.error || res.statusText));
      return;
    }
    
    setNewSubName("");
    fetchSubjects();
  };

  const handleAddTopic = async (subId: string) => {
    if(!newTopicName.trim()) return;
    const slug = newTopicName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const token = await user?.getIdToken();
    const res = await fetch('/api/admin/topics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ name: newTopicName, slug, subject_id: subId })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      alert("Failed to add topic: " + (errorData.error || res.statusText));
      return;
    }
    
    setNewTopicName("");
    setAddingTopicTo(null);
    fetchSubjects();
  };

  const handleDeleteTopic = async (id: string) => {
    const token = await user?.getIdToken();
    const res = await fetch(`/api/admin/topics?id=${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      alert("Failed to delete topic: " + (errorData.error || res.statusText));
      return;
    }
    fetchSubjects();
  };

  const handleAddSubtopic = async (topicId: string) => {
    if(!newSubtopicName.trim()) return;
    const slug = newSubtopicName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const token = await user?.getIdToken();
    const res = await fetch('/api/admin/subtopics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ name: newSubtopicName, slug, topic_id: topicId })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      alert("Failed to add subtopic: " + (errorData.error || res.statusText));
      return;
    }
    
    setNewSubtopicName("");
    setAddingSubtopicTo(null);
    fetchSubjects();
  };

  const handleDeleteSubtopic = async (id: string) => {
    const token = await user?.getIdToken();
    const res = await fetch(`/api/admin/subtopics?id=${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      alert("Failed to delete subtopic: " + (errorData.error || res.statusText));
      return;
    }
    fetchSubjects();
  };

  // --- AI / Import Handlers ---
  const handleExtractContext = async () => {
    setValidationErrors([]);
    try {
      if (importMethod === 'text') {
        if (!aiSourceText.trim()) throw new Error("Please enter some text.");
        setAiExtractedContext(aiSourceText);
      }
    } catch (e: unknown) {
      setValidationErrors([e instanceof Error ? e.message : String(e)]);
    }
  };

  const handleValidateJson = () => {
    setValidationErrors([]);
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        throw new Error("JSON must be an array of questions.");
      }
      
      const validated = parsed.map((q, index) => {
        if (!q.question_text) throw new Error(`Question ${index + 1} is missing 'question_text'.`);
        if (!q.option_a || !q.option_b || !q.option_c || !q.option_d) {
          throw new Error(`Question ${index + 1} is missing one or more options.`);
        }
        if (!q.correct_option) throw new Error(`Question ${index + 1} is missing 'correct_option'.`);
        
        return {
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_option: q.correct_option,
          explanation: q.explanation || "No explanation provided.",
          subject: q.subject || "Polity",
          topic: q.topic || "General",
          difficulty: q.difficulty || "Medium",
          tags: q.tags || [],
          revision_priority: q.revision_priority || "normal",
          source: q.source || "original",
          option_a_explanation: q.option_a_explanation || null,
          option_b_explanation: q.option_b_explanation || null,
          option_c_explanation: q.option_c_explanation || null,
          option_d_explanation: q.option_d_explanation || null,
          elimination_tip: q.elimination_tip || null,
          memory_trick: q.memory_trick || null,
        };
      });
      
      setAiGeneratedQuestions(validated);
    } catch (e: unknown) {
      setValidationErrors([e instanceof Error ? e.message : "Invalid JSON format."]);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!aiExtractedContext.trim()) return alert("No context to generate from.");
    setAiGenerating(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ text: aiExtractedContext, config: aiConfig })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiGeneratedQuestions(data.data);
    } catch (e: unknown) {
      alert("Generation failed: " + (e instanceof Error ? e.message : String(e)));
    }
    setAiGenerating(false);
  };

  const handleBulkSave = async () => {
    setSaving(true)
    setSaveProgress(0)
    setErrorStr("")
    setSuccessMessage("")

    try {
      // Add debug log to see what we're sending
      console.log('[handleBulkSave] Sending questions to API:', 
        JSON.stringify(aiGeneratedQuestions, null, 2))

      const token = await user?.getIdToken();
      const response = await fetch('/api/admin/save-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          questions: aiGeneratedQuestions,
        }),
      })

      // Check content type before parsing
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        const rawText = await response.text()
        console.error('[handleBulkSave] Non-JSON response:', rawText)
        setErrorStr(`Server returned an unexpected response (${response.status}). Check that SUPABASE_SERVICE_ROLE_KEY is set in .env.local and Vercel.`)
        return
      }

      const result = await response.json()
      console.log('[handleBulkSave] API response:', result)

      if (!response.ok) {
        setErrorStr(result.error || 'Save failed — check Vercel/server logs.')
        return
      }

      setSaveProgress(100)

      if (result.saved > 0) {
        setSuccessMessage(`✅ ${result.saved} question${result.saved > 1 ? 's' : ''} saved to database!`)
        setAiGeneratedQuestions([])
        setJsonText('')
      }

      if (result.failed > 0) {
        setErrorStr(
          `${result.failed} question${result.failed > 1 ? 's' : ''} failed:\n` +
          (result.errors || []).join('\n')
        )
      }

      if (result.saved === 0 && result.failed === 0) {
        setErrorStr('No questions were processed. Check that your JSON has valid question_text, option_a–d, and correct_option fields.')
      }

    } catch (err) {
      console.error('[handleBulkSave] Network/fetch error:', err)
      setErrorStr('Network error: ' + String(err))
    } finally {
      setSaving(false)
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>

        <div className="flex flex-wrap gap-2 bg-white/5 p-1 rounded-lg w-fit mb-8 border border-white/10">
          {[
            { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            { id: "add", label: "Add Question", icon: PlusCircle },
            { id: "manage", label: "Manage Questions", icon: List },
            { id: "subjects", label: "Subjects & Topics", icon: BookOpen },
            { id: "generator", label: "AI Question Studio", icon: Brain },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as "dashboard" | "add" | "manage" | "subjects" | "generator")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
                activeTab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {activeTab === "dashboard" && <DashboardTab />}

        {/* Add Question Tab */}
        {activeTab === "add" && (
           <QuestionForm
              initialData={editingQuestion || undefined}
              subjects={subjects}
              topics={topics}
              subtopics={subtopics}
              onSuccess={() => {
                setEditingQuestion(null);
                setActiveTab("manage");
              }}
              onCancel={handleCancelEdit}
           />
        )}

        {/* Manage Questions Tab */}
        {activeTab === "manage" && (
          <ManageTab onEdit={(q) => {
            setEditingQuestion({
              ...q,
              tags: q.tags ? (q.tags as string[]).join(", ") : "",
            } as unknown as QuestionFormValues);
            setActiveTab("add");
          }} />
        )}
      
        {/* ================= SUBJECTS & TOPICS ================= */}
        {activeTab === "subjects" && (
          <div className="space-y-8">
            <div className="bg-card border border-white/10 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-white mb-6">Add New Subject</h2>
              <form onSubmit={handleAddSubject} className="flex gap-4">
                <input type="text" value={newSubName} onChange={e=>setNewSubName(e.target.value)} placeholder="Subject Name" required className="flex-1 bg-background border border-white/10 rounded-lg py-2.5 px-4 text-white" />
                <input type="color" value={newSubColor} onChange={e=>setNewSubColor(e.target.value)} className="w-12 h-12 p-1 rounded-lg bg-background border border-white/10 cursor-pointer" />
                <input type="text" value={newSubIcon} onChange={e=>setNewSubIcon(e.target.value)} placeholder="Emoji (e.g. 📚)" required className="w-24 text-center bg-background border border-white/10 rounded-lg py-2.5 px-4 text-white" />
                <button type="submit" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-bold">Add Subject</button>
              </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map(s => (
                <div key={s.id as string} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{s.icon as string}</span>
                    <h3 className="text-lg font-bold text-white" style={{color: s.color as string}}>{s.name as string}</h3>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {topics.filter(t => t.subject_id === s.id).map(t => (
                      <div key={t.id as string} className="flex flex-col bg-white/5 p-3 rounded-md">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-300">{t.name as string}</span>
                          <button onClick={() => handleDeleteTopic(t.id as string)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        
                        {/* Subtopics UI inside Topic */}
                        <div className="pl-4 border-l border-white/10 space-y-1 mt-1">
                          {subtopics.filter(st => st.topic_id === t.id).map(st => (
                            <div key={st.id as string} className="flex justify-between items-center py-1">
                              <span className="text-xs text-gray-400">• {st.name as string}</span>
                              <button onClick={() => handleDeleteSubtopic(st.id as string)} className="text-red-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          ))}
                          
                          {addingSubtopicTo === t.id ? (
                            <div className="flex gap-2 mt-2">
                              <input type="text" autoFocus value={newSubtopicName} onChange={e=>setNewSubtopicName(e.target.value)} className="flex-1 bg-background border border-white/10 rounded-md py-1 px-2 text-xs text-white" placeholder="Subtopic..." />
                              <button onClick={() => handleAddSubtopic(t.id as string)} className="bg-green-500/20 text-green-400 px-2 py-1 rounded-md text-xs">Save</button>
                            </div>
                          ) : (
                            <button onClick={() => { setAddingSubtopicTo(t.id as string); setNewSubtopicName(""); }} className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">+ subtopic</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {addingTopicTo === s.id ? (
                    <div className="flex gap-2">
                      <input type="text" autoFocus value={newTopicName} onChange={e=>setNewTopicName(e.target.value)} className="flex-1 bg-background border border-white/10 rounded-md py-1.5 px-3 text-sm text-white" placeholder="Topic name..." />
                      <button onClick={() => handleAddTopic(s.id as string)} className="bg-green-500/20 text-green-400 px-3 py-1.5 rounded-md text-sm">Save</button>
                    </div>
                  ) : (
                    <button onClick={() => { setAddingTopicTo(s.id as string); setNewTopicName(""); }} className="text-sm text-primary hover:underline flex items-center gap-1">+ Add Topic</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= AI QUESTION STUDIO / IMPORT ================= */}
        {activeTab === "generator" && (
          <div className="space-y-8">
            <div className="bg-card border border-white/10 rounded-xl p-6 shadow-xl">
              <h2 className="text-xl font-semibold text-white mb-6">Import Questions</h2>
              
              {validationErrors.length > 0 && (
                <div className={`mb-6 p-4 rounded-xl border ${validationErrors[0]?.includes('scanned document') ? 'bg-amber-950 border-amber-700' : 'bg-amber-500/20 border-amber-500/50 text-amber-400'}`}>
                  {validationErrors[0]?.includes('scanned document') ? (
                    <div>
                      <p className="text-amber-300 font-medium mb-2">📄 Scanned PDF detected</p>
                      <p className="text-amber-200 text-sm mb-3">This PDF contains images of text, not actual text. Use this AI prompt to extract the MCQs:</p>
                      <div className="bg-zinc-900 rounded p-3 text-xs text-zinc-300 font-mono mb-3 whitespace-pre-wrap select-all">
                        {`Extract all MCQs from this PDF. Return ONLY a JSON array \nwith no extra text or markdown. Each object must have:\nquestion_text, option_a, option_b, option_c, option_d,\ncorrect_option (value must be: a, b, c, or d),\nexplanation, why_a_wrong, why_b_wrong, why_c_wrong, \nwhy_d_wrong, elimination_tip, \ndifficulty (easy, medium, or hard),\nsubject (one of: Polity, History, Geography, Economy, \nEnvironment, Science & Tech, Current Affairs),\ntopic, static_topic_link, tags (array of strings)`}
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`Extract all MCQs from this PDF. Return ONLY a JSON array with no extra text or markdown. Each object must have: question_text, option_a, option_b, option_c, option_d, correct_option (value must be: a, b, c, or d), explanation, why_a_wrong, why_b_wrong, why_c_wrong, why_d_wrong, elimination_tip, difficulty (easy, medium, or hard), subject (one of: Polity, History, Geography, Economy, Environment, Science & Tech, Current Affairs), topic, static_topic_link, tags (array of strings)`)
                          setCopied(true)
                          setTimeout(() => setCopied(false), 2000)
                        }}
                        className="text-xs bg-amber-700 hover:bg-amber-600 text-white px-3 py-1.5 rounded mr-2"
                      >
                        {copied ? '✓ Copied!' : '📋 Copy Prompt'}
                      </button>
                      <button
                        onClick={() => setImportMethod('json')}
                        className="text-xs bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1.5 rounded"
                      >
                        Go to Paste JSON tab →
                      </button>
                    </div>
                  ) : (
                    <>
                      <h4 className="font-bold mb-2 text-amber-400">Notice / Errors:</h4>
                      <ul className="list-disc pl-5 text-sm space-y-1 text-amber-400">
                        {validationErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}

              {/* 3-Tab UI Header */}
              <div className="flex border-b border-white/10 mb-6">
                {[
                  { id: "pdf", label: "📄 PDF Upload" },
                  { id: "json", label: "📋 Paste JSON" },
                  { id: "text", label: "📝 Paste Text" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setImportMethod(tab.id as "pdf" | "json" | "text");
                      setValidationErrors([]);
                      setAiGeneratedQuestions([]);
                    }}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                      importMethod === tab.id
                        ? "border-amber-500 text-amber-400"
                        : "border-transparent text-gray-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              {importMethod === "pdf" && (
                <div className="space-y-6">
                  {/* AI Config for PDF background processing */}
                  <div className="bg-card border border-white/10 rounded-xl p-6 shadow-xl">
                    <h3 className="text-lg font-semibold text-white mb-4">Configuration (Optional)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                      <div><label className="block text-xs text-gray-400 mb-1">Questions per chunk</label><select value={aiConfig.count} onChange={e=>setAiConfig({...aiConfig, count: Number(e.target.value)})} className="w-full bg-background border border-white/10 rounded text-white p-2 text-sm"><option value="5">5</option><option value="10">10</option><option value="15">15</option></select></div>
                      <div><label className="block text-xs text-gray-400 mb-1">Difficulty</label><select value={aiConfig.difficulty} onChange={e=>setAiConfig({...aiConfig, difficulty: e.target.value})} className="w-full bg-background border border-white/10 rounded text-white p-2 text-sm"><option>Mixed</option><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
                      <div><label className="block text-xs text-gray-400 mb-1">Subject</label><input type="text" value={aiConfig.subject} onChange={e=>setAiConfig({...aiConfig, subject: e.target.value})} className="w-full bg-background border border-white/10 rounded text-white p-2 text-sm" /></div>
                      <div><label className="block text-xs text-gray-400 mb-1">Topic</label><input type="text" value={aiConfig.topic} onChange={e=>setAiConfig({...aiConfig, topic: e.target.value})} className="w-full bg-background border border-white/10 rounded text-white p-2 text-sm" /></div>
                    </div>
                  </div>

                  <PdfUploader 
                    aiConfig={aiConfig}
                    onExtractionComplete={(count) => {
                      setSuccessMessage(`Successfully processed PDF! ${count} questions were generated and staged.`);
                    }}
                  />
                </div>
              )}

              {importMethod === "text" && (
                <div className="space-y-4">
                  <textarea 
                    value={aiSourceText} 
                    onChange={e => setAiSourceText(e.target.value)} 
                    className="w-full h-40 bg-background border border-white/10 rounded-lg p-4 text-white" 
                    placeholder="Paste your text or notes here to let AI generate questions..." 
                  />
                  <div className="flex justify-end">
                    <button 
                      onClick={handleExtractContext} 
                      disabled={!aiSourceText.trim()} 
                      className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
                    >
                      Step 1: Extract & Preview Content
                    </button>
                  </div>
                </div>
              )}

              {importMethod === "json" && (
                <div className="space-y-4">
                  <details className="mb-4">
                    <summary className="text-sm text-amber-400 cursor-pointer">
                      💡 How to generate JSON from your PDF using AI
                    </summary>
                    <div className="mt-2 bg-zinc-900 rounded-lg p-4">
                      <p className="text-zinc-400 text-sm mb-2">
                        Upload your PDF to ChatGPT / Gemini / Claude 
                        and use this prompt:
                      </p>
                      <div className="bg-zinc-800 rounded p-3 text-xs text-zinc-300 font-mono whitespace-pre-wrap select-all">
                        {`Extract all MCQs from this PDF. Return ONLY a JSON array \nwith no extra text or markdown. Each object must have:\nquestion_text, option_a, option_b, option_c, option_d,\ncorrect_option (value must be: a, b, c, or d),\nexplanation, why_a_wrong, why_b_wrong, why_c_wrong, \nwhy_d_wrong, elimination_tip, \ndifficulty (easy, medium, or hard),\nsubject (one of: Polity, History, Geography, Economy, \nEnvironment, Science & Tech, Current Affairs),\ntopic, static_topic_link, tags (array of strings)`}
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`Extract all MCQs from this PDF. Return ONLY a JSON array with no extra text or markdown. Each object must have: question_text, option_a, option_b, option_c, option_d, correct_option (value must be: a, b, c, or d), explanation, why_a_wrong, why_b_wrong, why_c_wrong, why_d_wrong, elimination_tip, difficulty (easy, medium, or hard), subject (one of: Polity, History, Geography, Economy, Environment, Science & Tech, Current Affairs), topic, static_topic_link, tags (array of strings)`)
                          setCopied(true)
                          setTimeout(() => setCopied(false), 2000)
                        }}
                        className="text-xs bg-amber-700 hover:bg-amber-600 text-white px-3 py-1.5 rounded mt-3"
                      >
                        {copied ? '✓ Copied!' : '📋 Copy Prompt'}
                      </button>
                    </div>
                  </details>
                  <p className="text-sm text-gray-400">
                    Paste an array of questions in JSON format. The system will automatically validate the schema and fill in missing fields with defaults.
                  </p>
                  <textarea 
                    value={jsonText} 
                    onChange={e => setJsonText(e.target.value)} 
                    className="w-full h-64 bg-background border border-white/10 rounded-lg p-4 text-white font-mono text-sm" 
                    placeholder={'[\n  {\n    "question_text": "...",\n    "option_a": "...",\n    "option_b": "...",\n    "option_c": "...",\n    "option_d": "...",\n    "correct_option": "A"\n  }\n]'} 
                  />
                  <div className="flex justify-end">
                    <button 
                      onClick={handleValidateJson} 
                      className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
                    >
                      Validate JSON
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2 AI Configuration (Only for Text) */}
            {importMethod === "text" && aiExtractedContext !== "" && (
              <div className="bg-card border border-white/10 rounded-xl p-6 shadow-xl">
                <h3 className="text-lg font-semibold text-white mb-4">Step 2: Refine Context & Configure AI</h3>
                <textarea 
                  value={aiExtractedContext} 
                  onChange={e => setAiExtractedContext(e.target.value)} 
                  className="w-full h-48 bg-background border border-white/10 rounded-lg p-4 text-gray-300 text-sm mb-6 font-mono" 
                />
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div><label className="block text-xs text-gray-400 mb-1">Questions</label><select value={aiConfig.count} onChange={e=>setAiConfig({...aiConfig, count: Number(e.target.value)})} className="w-full bg-background border border-white/10 rounded text-white p-2 text-sm"><option value="5">5</option><option value="10">10</option><option value="15">15</option></select></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Difficulty</label><select value={aiConfig.difficulty} onChange={e=>setAiConfig({...aiConfig, difficulty: e.target.value})} className="w-full bg-background border border-white/10 rounded text-white p-2 text-sm"><option>Mixed</option><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Subject</label><input type="text" value={aiConfig.subject} onChange={e=>setAiConfig({...aiConfig, subject: e.target.value})} className="w-full bg-background border border-white/10 rounded text-white p-2 text-sm" /></div>
                  <div><label className="block text-xs text-gray-400 mb-1">Topic</label><input type="text" value={aiConfig.topic} onChange={e=>setAiConfig({...aiConfig, topic: e.target.value})} className="w-full bg-background border border-white/10 rounded text-white p-2 text-sm" /></div>
                </div>

                <div className="flex justify-end">
                  <button onClick={handleGenerateQuestions} disabled={aiGenerating} className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-semibold flex items-center gap-2">
                    <Brain className="w-4 h-4" /> {aiGenerating ? "Generating MCQs (this takes time)..." : "Step 3: Generate MCQs"}
                  </button>
                </div>
              </div>
            )}

            {saving && (
              <div className="bg-blue-500/20 border border-blue-500/50 p-4 rounded-xl flex items-center gap-4 text-blue-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                <div className="flex-1">
                  <p className="font-bold">Saving to Database...</p>
                  <div className="w-full bg-blue-950 rounded-full h-2.5 mt-2 overflow-hidden">
                    <div className="bg-blue-400 h-2.5" style={{ width: `${saveProgress}%` }}></div>
                  </div>
                </div>
              </div>
            )}
            
            {successMessage && (
              <div className="bg-green-500/20 border border-green-500/50 p-4 rounded-xl flex items-center gap-4 text-green-400">
                <CheckCircle2 className="w-6 h-6" />
                <p className="font-bold">{successMessage}</p>
              </div>
            )}
            
            {errorStr && (
              <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-xl text-red-400 whitespace-pre-wrap">
                {errorStr}
              </div>
            )}

            {/* Table Preview */}
            {aiGeneratedQuestions.length > 0 && (
              <div className="bg-card border border-white/10 rounded-xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Preview & Edit</h3>
                    <p className="text-sm text-gray-400">{aiGeneratedQuestions.length} questions ready to import</p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setAiGeneratedQuestions([])} 
                      className="border border-white/20 hover:bg-white/10 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                    >
                      Clear & Start Over
                    </button>
                    <button 
                      onClick={handleBulkSave} 
                      className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all"
                    >
                      <Save className="w-4 h-4" /> Save All to Database
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="pb-3 text-sm font-medium text-gray-400">#</th>
                        <th className="pb-3 text-sm font-medium text-gray-400">Question</th>
                        <th className="pb-3 text-sm font-medium text-gray-400">Subject</th>
                        <th className="pb-3 text-sm font-medium text-gray-400">Diff</th>
                        <th className="pb-3 text-sm font-medium text-gray-400 text-center">Ans</th>
                        <th className="pb-3 text-sm font-medium text-gray-400 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {aiGeneratedQuestions.map((q, idx) => {
                        const correctText = {
                          'a': q.option_a,
                          'b': q.option_b,
                          'c': q.option_c,
                          'd': q.option_d,
                        }[(q.correct_option as string)?.toLowerCase()];

                        const difficultyColor = {
                          'easy': 'bg-green-900 text-green-300',
                          'medium': 'bg-amber-900 text-amber-300',
                          'hard': 'bg-red-900 text-red-300',
                        }[(q.difficulty as string)?.toLowerCase()] || 'bg-zinc-700 text-zinc-300';

                        return (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 text-gray-400">{idx + 1}</td>
                          <td className="py-4 pr-4">
                            <div className="max-w-md truncate text-gray-300">
                              {q.question_text as string}
                            </div>
                          </td>
                          <td className="py-4 pr-4 text-gray-300">
                            {q.subject as string}
                          </td>
                          <td className="py-4 pr-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${difficultyColor}`}>
                              {q.difficulty as string}
                            </span>
                          </td>
                          <td className="py-4 text-center">
                            <span className="text-green-400 font-medium whitespace-nowrap text-xs">
                              {(q.correct_option as string)?.toUpperCase()}. {typeof correctText === 'string' ? correctText.substring(0,40) : ''}...
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => {
                                  setEditingQuestion({
                                    ...q,
                                    tags: q.tags ? (q.tags as string[]).join(", ") : "",
                                  } as unknown as QuestionFormValues);
                                  setActiveTab("add");
                                }}
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => { const copy = [...aiGeneratedQuestions]; copy.splice(idx, 1); setAiGeneratedQuestions(copy); }}
                                className="p-1.5 text-red-400 hover:text-white hover:bg-red-500 rounded-md transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function AdminPage() {
  return (
    <ErrorBoundary fallbackMessage="The Admin Dashboard encountered an unexpected error.">
      <AdminInner />
    </ErrorBoundary>
  );
}
