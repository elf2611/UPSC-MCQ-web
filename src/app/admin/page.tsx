"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { supabase } from "@/lib/supabase";
import { PlusCircle, List, Pencil, Trash2, Search } from "lucide-react";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"add" | "manage">("add");
  const [questions, setQuestions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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

  useEffect(() => {
    if (activeTab === "manage") {
      fetchQuestions();
    }
  }, [activeTab]);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setQuestions(data);
    setLoading(false);
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const newQuestion = {
      subject,
      topic,
      difficulty,
      year,
      question_text: questionText,
      option_a: optionA,
      option_b: optionB,
      option_c: optionC,
      option_d: optionD,
      correct_option: correctOption,
      explanation
    };

    const { error } = await supabase.from("questions").insert(newQuestion);

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage("Question added successfully!");
      // Reset form
      setTopic("");
      setQuestionText("");
      setOptionA("");
      setOptionB("");
      setOptionC("");
      setOptionD("");
      setExplanation("");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this question?")) {
      await supabase.from("questions").delete().eq("id", id);
      fetchQuestions();
    }
  };

  const filteredQuestions = questions.filter(q => 
    q.question_text?.toLowerCase().includes(search.toLowerCase()) ||
    q.subject?.toLowerCase().includes(search.toLowerCase()) ||
    q.topic?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ProtectedRoute adminOnly>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Admin Dashboard</h1>

        {/* Tabs */}
        <div className="flex space-x-1 bg-white/5 p-1 rounded-lg w-fit mb-8 border border-white/10">
          <button
            onClick={() => setActiveTab("add")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "add" 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            Add Question
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === "manage" 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <List className="h-4 w-4" />
            Manage Questions
          </button>
        </div>

        {/* Add Question Tab */}
        {activeTab === "add" && (
          <div className="bg-card border border-white/10 rounded-xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-6">Add New MCQ</h2>
            
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
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Year (if PYQ)</label>
                  <input 
                    type="number" 
                    value={year} 
                    onChange={e => setYear(Number(e.target.value))}
                    className="w-full bg-background border border-white/10 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
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
                <label className="block text-sm font-medium text-gray-300 mb-2">Explanation</label>
                <textarea 
                  value={explanation} 
                  onChange={e => setExplanation(e.target.value)}
                  className="w-full bg-background border border-white/10 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[120px]"
                  placeholder="Explain why the correct option is right..."
                />
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-primary text-primary-foreground font-semibold py-2.5 px-8 rounded-lg hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(255,191,0,0.3)] hover:shadow-[0_0_25px_rgba(255,191,0,0.5)] disabled:opacity-70"
                >
                  {loading ? "Saving..." : "Save Question"}
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
                      <tr key={q.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 text-gray-300 pr-4">{q.subject}</td>
                        <td className="py-4 text-gray-300 pr-4">{q.topic}</td>
                        <td className="py-4 text-gray-300 pr-4">
                          <div className="max-w-md truncate">{q.question_text}</div>
                        </td>
                        <td className="py-4 pr-4">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            q.difficulty === 'Easy' ? 'bg-green-500/10 text-green-400' :
                            q.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {q.difficulty}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(q.id)}
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
      </div>
    </ProtectedRoute>
  );
}
