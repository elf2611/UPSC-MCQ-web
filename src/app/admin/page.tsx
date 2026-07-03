"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { supabase } from "@/lib/supabase";
import { PlusCircle, List, Pencil, Trash2, Search, Brain, BookOpen, Save, CheckCircle2 } from "lucide-react";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"add" | "manage" | "subjects" | "generator">("add");
  const [questions, setQuestions] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editingQuestion, setEditingQuestion] = useState<Record<string, unknown> | null>(null);

  // Form State
  const [subject, setSubject] = useState("Polity");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [year, setYear] = useState(new Date().getFullYear());
  const [questionText, setQuestionText] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctOption, setCorrectOption] = useState("A");
  const [explanation, setExplanation] = useState("");

  // Advanced Form Fields
  const [optionAExplanation, setOptionAExplanation] = useState("");
  const [optionBExplanation, setOptionBExplanation] = useState("");
  const [optionCExplanation, setOptionCExplanation] = useState("");
  const [optionDExplanation, setOptionDExplanation] = useState("");
  const [eliminationTip, setEliminationTip] = useState("");
  const [memoryTrick, setMemoryTrick] = useState("");
  const [staticTopicLink, setStaticTopicLink] = useState("");
  const [relatedCurrentAffairs, setRelatedCurrentAffairs] = useState("");
  const [estimatedSolvingTime, setEstimatedSolvingTime] = useState(60);
  const [revisionPriority, setRevisionPriority] = useState("normal");
  const [source, setSource] = useState("original");
  const [tags, setTags] = useState("");

  // Subjects & Topics State
  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [topics, setTopics] = useState<Record<string, unknown>[]>([]);
  const [newSubName, setNewSubName] = useState("");
  const [newSubColor, setNewSubColor] = useState("#6366f1");
  const [newSubIcon, setNewSubIcon] = useState("📚");
  const [addingTopicTo, setAddingTopicTo] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState("");

  // AI Generator State
  const [importMethod, setImportMethod] = useState<"pdf" | "json" | "text">("pdf");
  const [jsonText, setJsonText] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [aiSourceText, setAiSourceText] = useState("");
  const [aiPdfFile, setAiPdfFile] = useState<File | null>(null);
  const [aiExtracting, setAiExtracting] = useState(false);
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
  const [aiSaveStats, setAiSaveStats] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (activeTab === "manage") {
      fetchQuestions();
    } else if (activeTab === "subjects" || activeTab === "generator") {
      fetchSubjects();
    }
  }, [activeTab]);

  const fetchSubjects = async () => {
    const { data: s } = await supabase.from("subjects").select("*").order("name");
    const { data: t } = await supabase.from("topics").select("*").order("name");
    if (s) setSubjects(s);
    if (t) setTopics(t);
  };

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) console.error(error);
    if (data) setQuestions(data);
    setLoading(false);
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const questionData = {
      subject,
      topic,
      difficulty,
      question_text: questionText,
      option_a: optionA,
      option_b: optionB,
      option_c: optionC,
      option_d: optionD,
      correct_option: correctOption,
      explanation,
      option_a_explanation: correctOption !== 'A' ? optionAExplanation : null,
      option_b_explanation: correctOption !== 'B' ? optionBExplanation : null,
      option_c_explanation: correctOption !== 'C' ? optionCExplanation : null,
      option_d_explanation: correctOption !== 'D' ? optionDExplanation : null,
      elimination_tip: eliminationTip,
      memory_trick: memoryTrick,
      static_topic_link: staticTopicLink,
      related_current_affairs: relatedCurrentAffairs,
      estimated_solving_time: estimatedSolvingTime,
      revision_priority: revisionPriority,
      source,
      year: source === 'PYQ' ? year : null,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean)
    };

    let error;
    if (editingQuestion) {
      const { error: updateError } = await supabase.from("questions").update(questionData).eq("id", editingQuestion.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("questions").insert(questionData);
      error = insertError;
    }

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage(editingQuestion ? "Question updated successfully!" : "Question added successfully!");
      if (editingQuestion) {
        setEditingQuestion(null);
        fetchQuestions();
      }
      // Reset form
      setTopic("");
      setQuestionText("");
      setOptionA("");
      setOptionB("");
      setOptionC("");
      setOptionD("");
      setExplanation("");
      setOptionAExplanation("");
      setOptionBExplanation("");
      setOptionCExplanation("");
      setOptionDExplanation("");
      setEliminationTip("");
      setMemoryTrick("");
      setStaticTopicLink("");
      setRelatedCurrentAffairs("");
      setTags("");
    }
    setLoading(false);
  };

  const handleCancelEdit = () => {
    setEditingQuestion(null);
    setActiveTab("manage");
    setMessage("");
    setTopic("");
    setQuestionText("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setExplanation("");
    setOptionAExplanation("");
    setOptionBExplanation("");
    setOptionCExplanation("");
    setOptionDExplanation("");
    setEliminationTip("");
    setMemoryTrick("");
    setStaticTopicLink("");
    setRelatedCurrentAffairs("");
    setTags("");
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this question?")) {
      await supabase.from("questions").delete().eq("id", id);
      fetchQuestions();
    }
  };

  // --- Subjects Handlers ---
  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const slug = newSubName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await supabase.from("subjects").insert({ name: newSubName, slug, color: newSubColor, icon: newSubIcon });
    setNewSubName("");
    fetchSubjects();
  };

  const handleAddTopic = async (subId: string) => {
    if(!newTopicName.trim()) return;
    const slug = newTopicName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await supabase.from("topics").insert({ name: newTopicName, slug, subject_id: subId });
    setNewTopicName("");
    setAddingTopicTo(null);
    fetchSubjects();
  };

  const handleDeleteTopic = async (id: string) => {
    await supabase.from("topics").delete().eq("id", id);
    fetchSubjects();
  };

  // --- AI / Import Handlers ---
  const handleExtractContext = async () => {
    setAiExtracting(true);
    setValidationErrors([]);
    try {
      if (importMethod === 'text') {
        setAiExtractedContext(aiSourceText);
      } else if (importMethod === 'pdf') {
        if (!aiPdfFile) {
          throw new Error("Please select a PDF file first.");
        }
        
        const formData = new FormData();
        formData.append("pdf", aiPdfFile);

        const res = await fetch("/api/extract-pdf", { method: "POST", body: formData });
        
        // Safe fetch wrapper to handle Vercel HTML error pages gracefully
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Extraction failed");
          setAiExtractedContext(data.text);
        } else {
          const textResponse = await res.text();
          console.error("Non-JSON Response:", textResponse);
          if (res.status === 413) {
            throw new Error("File too large. Please upload a smaller PDF (under 10MB).");
          }
          throw new Error("Received an invalid response from the server. File might be too large.");
        }
      }
    } catch (e: unknown) {
      setValidationErrors([e instanceof Error ? e.message : String(e)]);
    }
    setAiExtracting(false);
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
    setAiSaveStats(null);
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    let saved = 0, skipped = 0, failed = 0;
    const { data: existing } = await supabase.from("questions").select("question_text");
    const existingTexts = new Set(existing?.map(q => q.question_text) || []);

    for (const q of aiGeneratedQuestions) {
      if (existingTexts.has(q.question_text)) {
        skipped++;
        continue;
      }
      
      const toInsert = { ...q } as Record<string, unknown>;
      
      // Handle AI format which uses why_x_wrong instead of option_x_explanation
      if (toInsert.why_a_wrong !== undefined) {
        toInsert.option_a_explanation = toInsert.why_a_wrong;
        delete toInsert.why_a_wrong;
      }
      if (toInsert.why_b_wrong !== undefined) {
        toInsert.option_b_explanation = toInsert.why_b_wrong;
        delete toInsert.why_b_wrong;
      }
      if (toInsert.why_c_wrong !== undefined) {
        toInsert.option_c_explanation = toInsert.why_c_wrong;
        delete toInsert.why_c_wrong;
      }
      if (toInsert.why_d_wrong !== undefined) {
        toInsert.option_d_explanation = toInsert.why_d_wrong;
        delete toInsert.why_d_wrong;
      }

      const { error } = await supabase.from("questions").insert(toInsert);
      if (error) {
        console.error("Insert error for question:", q.question_text, error);
        failed++;
      } else {
        saved++;
      }
    }

    setAiSaveStats({ saved, skipped, failed, total: aiGeneratedQuestions.length });
    if (saved > 0) setAiGeneratedQuestions([]);
  };

  const filteredQuestions = questions.filter(q => 
    (q.question_text as string)?.toLowerCase().includes(search.toLowerCase()) ||
    (q.subject as string)?.toLowerCase().includes(search.toLowerCase()) ||
    (q.topic as string)?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProtectedRoute adminOnly>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>

        <div className="flex flex-wrap gap-2 bg-white/5 p-1 rounded-lg w-fit mb-8 border border-white/10">
          {[
            { id: "add", label: "Add Question", icon: PlusCircle },
            { id: "manage", label: "Manage Questions", icon: List },
            { id: "subjects", label: "Subjects & Topics", icon: BookOpen },
            { id: "generator", label: "AI Question Studio", icon: Brain },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as "add" | "manage" | "subjects" | "generator")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
                activeTab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Add Question Tab */}
        {activeTab === "add" && (
          <div className="bg-card border border-white/10 rounded-xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-6">{editingQuestion ? "Edit MCQ" : "Add New MCQ"}</h2>
            
            {message && (
              <div className={`p-4 rounded-lg mb-6 text-sm ${message.includes("Error") ? "bg-destructive/20 border border-destructive text-destructive-foreground" : "bg-green-500/20 border border-green-500 text-green-400"}`}>
                {message}
              </div>
            )}

            <form onSubmit={handleAddQuestion} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
                  <select 
                    value={subject} 
                    onChange={e => setSubject(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {["Polity", "History", "Geography", "Economy", "Environment", "Science & Tech", "Current Affairs"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Topic</label>
                  <input 
                    type="text" 
                    required 
                    value={topic} 
                    onChange={e => setTopic(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g., Fundamental Rights"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Difficulty</label>
                  <select 
                    value={difficulty} 
                    onChange={e => setDifficulty(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Question Text</label>
                <textarea 
                  required 
                  value={questionText} 
                  onChange={e => setQuestionText(e.target.value)}
                  className="w-full bg-background border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[120px]"
                  placeholder="Enter the question here..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['A', 'B', 'C', 'D'].map(opt => (
                  <div key={opt}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Option {opt}</label>
                    <input 
                      type="text" 
                      required 
                      value={eval(`option${opt}`)} 
                      onChange={e => eval(`setOption${opt}`)(e.target.value)}
                      className="w-full bg-background border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder={`Option ${opt} text`}
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Correct Option</label>
                <div className="flex space-x-4">
                  {['A', 'B', 'C', 'D'].map(opt => (
                    <label key={opt} className="flex items-center space-x-2 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${correctOption === opt ? 'border-primary bg-primary/20' : 'border-white/30 group-hover:border-primary/50'}`}>
                        {correctOption === opt && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <span className="text-gray-300">{opt}</span>
                      <input 
                        type="radio" 
                        name="correctOption" 
                        value={opt}
                        checked={correctOption === opt}
                        onChange={e => setCorrectOption(e.target.value)}
                        className="hidden"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Explanation (Correct Answer)</label>
                <textarea 
                  value={explanation} 
                  onChange={e => setExplanation(e.target.value)}
                  className="w-full bg-background border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[120px]"
                  placeholder="Explain why the correct option is right..."
                />
              </div>

              <details className="group border border-white/10 bg-white/5 rounded-xl p-4 transition-all" open>
                <summary className="text-sm font-semibold text-white cursor-pointer outline-none list-none flex items-center justify-between">
                  Advanced Explanation Fields (What makes Prepwise different)
                  <span className="group-open:rotate-180 transition-transform"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg></span>
                </summary>
                
                <div className="mt-6 space-y-6">
                  {/* Why Wrong Explanations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {correctOption !== 'A' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Why Option A is wrong</label>
                        <textarea value={optionAExplanation} onChange={e => setOptionAExplanation(e.target.value)} className="w-full bg-background border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]" placeholder="Explain why A misleads students..." />
                      </div>
                    )}
                    {correctOption !== 'B' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Why Option B is wrong</label>
                        <textarea value={optionBExplanation} onChange={e => setOptionBExplanation(e.target.value)} className="w-full bg-background border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]" placeholder="Explain why B misleads students..." />
                      </div>
                    )}
                    {correctOption !== 'C' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Why Option C is wrong</label>
                        <textarea value={optionCExplanation} onChange={e => setOptionCExplanation(e.target.value)} className="w-full bg-background border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]" placeholder="Explain why C misleads students..." />
                      </div>
                    )}
                    {correctOption !== 'D' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Why Option D is wrong</label>
                        <textarea value={optionDExplanation} onChange={e => setOptionDExplanation(e.target.value)} className="w-full bg-background border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]" placeholder="Explain why D misleads students..." />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">UPSC Elimination Tip</label>
                      <textarea value={eliminationTip} onChange={e => setEliminationTip(e.target.value)} className="w-full bg-background border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]" placeholder="What UPSC-specific logic helps eliminate wrong options?" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Memory Trick (Mnemonic)</label>
                      <textarea value={memoryTrick} onChange={e => setMemoryTrick(e.target.value)} className="w-full bg-background border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]" placeholder="e.g. BHAJSA for Mughal emperors..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Static Syllabus Connection</label>
                      <input type="text" value={staticTopicLink} onChange={e => setStaticTopicLink(e.target.value)} className="w-full bg-background border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="e.g. Polity → Article 32" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Related Current Affairs</label>
                      <input type="text" value={relatedCurrentAffairs} onChange={e => setRelatedCurrentAffairs(e.target.value)} className="w-full bg-background border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="e.g. Recent Supreme Court verdict on..." />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Source</label>
                      <select value={source} onChange={e => setSource(e.target.value)} className="w-full bg-background border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50">
                        <option value="original">Original</option>
                        <option value="PYQ">PYQ (Previous Year Question)</option>
                        <option value="current_affairs">Current Affairs</option>
                      </select>
                    </div>
                    {source === "PYQ" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Year</label>
                        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-full bg-background border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50" />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Revision Priority</label>
                      <select value={revisionPriority} onChange={e => setRevisionPriority(e.target.value)} className="w-full bg-background border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50">
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Estimated Time (sec)</label>
                      <input type="number" value={estimatedSolvingTime} onChange={e => setEstimatedSolvingTime(Number(e.target.value))} className="w-full bg-background border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tags (Comma-separated)</label>
                    <input type="text" value={tags} onChange={e => setTags(e.target.value)} className="w-full bg-background border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="e.g. budget, RBI, monetary policy" />
                  </div>
                </div>
              </details>

              <div className="flex justify-end pt-4 space-x-4">
                {editingQuestion && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="bg-white/10 text-white font-semibold py-2.5 px-8 rounded-lg hover:bg-white/20 transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-primary-foreground font-semibold py-2.5 px-8 rounded-lg hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(255,191,0,0.3)] hover:shadow-[0_0_25px_rgba(255,191,0,0.5)] disabled:opacity-70"
                >
                  {loading ? "Saving..." : editingQuestion ? "Update Question" : "Save Question"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Manage Questions Tab */}
        {activeTab === "manage" && (
          <div className="bg-card border border-white/10 rounded-xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-xl font-semibold text-white">Question Bank</h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input 
                  type="text" 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search questions..."
                  className="w-full bg-background border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
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
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">Loading questions...</td>
                    </tr>
                  ) : filteredQuestions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">No questions found.</td>
                    </tr>
                  ) : (
                    filteredQuestions.map((q) => (
                      <tr key={q.id as string} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 text-gray-300 pr-4">{q.subject as string}</td>
                        <td className="py-4 text-gray-300 pr-4">{q.topic as string}</td>
                        <td className="py-4 text-gray-300 pr-4">
                          <div className="max-w-md truncate">{q.question_text as string}</div>
                        </td>
                        <td className="py-4 pr-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            (q.difficulty as string) === 'Easy' ? 'bg-green-500/10 text-green-400' :
                            (q.difficulty as string) === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {q.difficulty as string}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                setEditingQuestion(q);
                                setSubject((q.subject as string) || "Polity");
                                setTopic((q.topic as string) || "");
                                setDifficulty((q.difficulty as string) || "Medium");
                                setYear((q.year as number) || new Date().getFullYear());
                                setQuestionText((q.question_text as string) || "");
                                setOptionA((q.option_a as string) || "");
                                setOptionB((q.option_b as string) || "");
                                setOptionC((q.option_c as string) || "");
                                setOptionD((q.option_d as string) || "");
                                setCorrectOption((q.correct_option as string) || "A");
                                setExplanation((q.explanation as string) || "");
                                setOptionAExplanation((q.option_a_explanation as string) || "");
                                setOptionBExplanation((q.option_b_explanation as string) || "");
                                setOptionCExplanation((q.option_c_explanation as string) || "");
                                setOptionDExplanation((q.option_d_explanation as string) || "");
                                setEliminationTip((q.elimination_tip as string) || "");
                                setMemoryTrick((q.memory_trick as string) || "");
                                setStaticTopicLink((q.static_topic_link as string) || "");
                                setRelatedCurrentAffairs((q.related_current_affairs as string) || "");
                                setEstimatedSolvingTime((q.estimated_solving_time as number) || 60);
                                setRevisionPriority((q.revision_priority as string) || "normal");
                                setSource((q.source as string) || "original");
                                setTags(q.tags ? (q.tags as string[]).join(", ") : "");
                                setActiveTab("add");
                              }}
                              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
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
          </div>
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
                      <div key={t.id as string} className="flex justify-between items-center bg-white/5 p-2 rounded-md">
                        <span className="text-sm text-gray-300">{t.name as string}</span>
                        <button onClick={() => handleDeleteTopic(t.id as string)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
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
                <div className="mb-6 bg-amber-500/20 border border-amber-500/50 p-4 rounded-xl text-amber-400">
                  <h4 className="font-bold mb-2">Notice / Errors:</h4>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
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
                      setAiSaveStats(null);
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
                <div className="space-y-4">
                  <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={e => setAiPdfFile(e.target.files?.[0] || null)} 
                    className="w-full bg-background border border-white/10 rounded-lg p-4 text-white" 
                  />
                  <div className="flex justify-end">
                    <button 
                      onClick={handleExtractContext} 
                      disabled={aiExtracting || !aiPdfFile} 
                      className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
                    >
                      {aiExtracting ? "Extracting..." : "Step 1: Extract & Preview Content"}
                    </button>
                  </div>
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
                      disabled={aiExtracting || !aiSourceText.trim()} 
                      className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
                    >
                      Step 1: Extract & Preview Content
                    </button>
                  </div>
                </div>
              )}

              {importMethod === "json" && (
                <div className="space-y-4">
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

            {/* Step 2 AI Configuration (Only for PDF and Text) */}
            {(importMethod === "pdf" || importMethod === "text") && aiExtractedContext !== "" && (
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

            {aiSaveStats && (
              <div className="bg-green-500/20 border border-green-500/50 p-4 rounded-xl flex items-center gap-4 text-green-400">
                <CheckCircle2 className="w-6 h-6" />
                <div>
                  <p className="font-bold">Save Complete</p>
                  <p className="text-sm">Total Processed: {aiSaveStats.total as number} | Saved: {aiSaveStats.saved as number} | Skipped (Duplicates): {aiSaveStats.skipped as number} | Failed: {aiSaveStats.failed as number}</p>
                </div>
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
                      {aiGeneratedQuestions.map((q, idx) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 text-gray-400">{idx + 1}</td>
                          <td className="py-4 pr-4">
                            <div className="max-w-md">
                              <input 
                                value={q.question_text as string} 
                                onChange={e => { const copy = [...aiGeneratedQuestions]; copy[idx].question_text = e.target.value; setAiGeneratedQuestions(copy); }} 
                                className="w-full bg-transparent text-gray-300 focus:outline-none focus:border-b focus:border-primary pb-1"
                              />
                            </div>
                          </td>
                          <td className="py-4 pr-4">
                            <input 
                              value={q.subject as string} 
                              onChange={e => { const copy = [...aiGeneratedQuestions]; copy[idx].subject = e.target.value; setAiGeneratedQuestions(copy); }} 
                              className="w-24 bg-transparent text-gray-300 focus:outline-none focus:border-b focus:border-primary pb-1"
                            />
                          </td>
                          <td className="py-4 pr-4">
                            <select 
                              value={q.difficulty as string} 
                              onChange={e => { const copy = [...aiGeneratedQuestions]; copy[idx].difficulty = e.target.value; setAiGeneratedQuestions(copy); }}
                              className="bg-transparent text-gray-300 focus:outline-none"
                            >
                              <option>Easy</option>
                              <option>Medium</option>
                              <option>Hard</option>
                            </select>
                          </td>
                          <td className="py-4 text-center">
                            <select 
                              value={q.correct_option as string} 
                              onChange={e => { const copy = [...aiGeneratedQuestions]; copy[idx].correct_option = e.target.value; setAiGeneratedQuestions(copy); }}
                              className="bg-transparent text-amber-400 font-bold focus:outline-none"
                            >
                              <option>A</option>
                              <option>B</option>
                              <option>C</option>
                              <option>D</option>
                            </select>
                          </td>
                          <td className="py-4 text-right">
                            <button 
                              onClick={() => { const copy = [...aiGeneratedQuestions]; copy.splice(idx, 1); setAiGeneratedQuestions(copy); }}
                              className="p-1.5 text-red-400 hover:text-white hover:bg-red-500 rounded-md transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
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
