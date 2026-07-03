"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useState, useEffect } from "react";
import { Filter, BookOpen, ChevronRight } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export default function PracticeTestsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Polity', 'History']);
  const [difficulty, setDifficulty] = useState("Medium");

  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [topicStats, setTopicStats] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch 1: subjects
      const { data: subjectsData, error: subError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
      
      console.log("Subjects in DB:", subjectsData?.length || 0);
      console.log("Supabase Subjects Fetch:", subjectsData);

      if (subError || !subjectsData) {
        setLoading(false);
        return;
      }
      setSubjects(subjectsData);
      setSelectedSubjects(subjectsData.map(s => s.name)); // Default select all

      // Fetch 2: questions count per subject
      const { data: questionCounts } = await supabase
        .from('questions')
        .select('subject_id, id');

      // Fetch 3: user's attempt stats
      let userAttempts: Record<string, unknown>[] = [];
      if (user) {
        const { data: userStats } = await supabase
          .from('question_attempts')
          .select('question_id, is_correct')
          .eq('user_id', user.uid);
        if (userStats) {
          userAttempts = userStats;
        }
      }

      // Build topic cards based on subjects
      const stats = subjectsData.map(sub => {
        const subQuestions = (questionCounts || []).filter(q => q.subject_id === sub.id);
        const subQuestionIds = new Set(subQuestions.map(q => q.id));
        const subAttempts = userAttempts.filter(a => subQuestionIds.has(a.question_id));
        
        return {
          id: sub.id,
          name: sub.name,
          slug: sub.slug,
          desc: sub.description || `${sub.name} questions for comprehensive preparation.`,
          totalQs: subQuestions.length,
          attempted: subAttempts.length,
          accuracy: subAttempts.length > 0 ? (subAttempts.filter(a => a.is_correct).length / subAttempts.length) * 100 : 0
        };
      });

      setTopicStats(stats);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const toggleSubject = (sub: string) => {
    setSelectedSubjects(prev => 
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  // Render Skeletons
  if (loading) {
    return (
      <ProtectedRoute>
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-64 flex-shrink-0">
            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-5 h-64 animate-pulse"></div>
          </aside>
          <main className="flex-1">
            <div className="h-24 bg-[#1a1a1a] rounded-xl mb-8 animate-pulse"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6 h-64 animate-pulse"></div>
              ))}
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  // Empty State
  if (subjects.length === 0) {
    return (
      <ProtectedRoute>
        <div className="max-w-7xl mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
          <span className="text-6xl mb-6">📚</span>
          <h2 className="text-3xl font-bold text-white mb-2">Question bank is being built</h2>
          <p className="text-gray-400 mb-8 max-w-md">Our team is adding questions. Check back soon or ask an admin to add questions.</p>
          <Link href="/" className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors">
            Go to Home
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Left Sidebar Filters */}
        <aside className="w-full md:w-64 flex-shrink-0">
          <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-5 sticky top-24">
            <div className="flex items-center gap-2 mb-6">
              <Filter className="w-4 h-4 text-gray-400" />
              <h3 className="text-white font-medium">Filters</h3>
            </div>

            {/* Subjects */}
            <div className="mb-8">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Subject</h4>
              <div className="space-y-3">
                {subjects.map(sub => (
                  <label key={sub.id as string} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedSubjects.includes(sub.name as string) ? 'bg-primary border-primary' : 'border-white/20 bg-background group-hover:border-white/40'}`}>
                      {selectedSubjects.includes(sub.name as string) && <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className="text-sm text-gray-300">{sub.name as string}</span>
                    <input type="checkbox" className="hidden" checked={selectedSubjects.includes(sub.name as string)} onChange={() => toggleSubject(sub.name as string)} />
                  </label>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Difficulty</h4>
              <div className="space-y-3">
                {["All Levels", "Easy", "Medium", "Hard"].map(diff => (
                  <label key={diff} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${difficulty === diff ? 'border-primary' : 'border-white/20 group-hover:border-white/40'}`}>
                      {difficulty === diff && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                    </div>
                    <span className="text-sm text-gray-300">{diff}</span>
                    <input type="radio" className="hidden" name="difficulty" checked={difficulty === diff} onChange={() => setDifficulty(diff)} />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white tracking-tight">Practice Questions</h1>
            <p className="text-gray-400 mt-2">Master topics through targeted question banks.</p>
          </div>

          {/* Topic Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {topicStats.filter(t => selectedSubjects.includes(t.name as string)).map(topic => (
              <div key={topic.id as string} className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6 flex flex-col hover:border-white/10 transition-colors relative">
                
                <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                    <BookOpen className="w-5 h-5 text-gray-400" />
                  </div>
                  <span className="text-xs font-medium bg-white/5 text-gray-300 px-3 py-1 rounded-full border border-white/10">
                    {topic.name as string}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2 leading-tight">{topic.name as string}</h3>
                <p className="text-sm text-gray-400 mb-6 line-clamp-2">{topic.desc as string}</p>
                
                <div className="mt-auto">
                  <div className="flex justify-between text-xs font-medium mb-2">
                    <span className="text-gray-500">Progress</span>
                    <span className="text-white">{topic.attempted as number} / {topic.totalQs as number} Qs</span>
                  </div>
                  <div className="w-full h-1.5 bg-background rounded-full overflow-hidden mb-6 border border-white/5">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: (topic.totalQs as number) > 0 ? `${((topic.attempted as number) / (topic.totalQs as number)) * 100}%` : '0%' }} 
                    />
                  </div>
                  
                  {(topic.totalQs as number) > 0 ? (
                    <Link 
                      href={`/test-interface?mode=practice&subject=${encodeURIComponent(topic.name as string)}&difficulty=${encodeURIComponent(difficulty)}`}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors border border-primary/20"
                    >
                      {(topic.attempted as number) > 0 ? "Continue Practice" : "Start Practice"}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <button 
                      disabled
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-semibold bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed"
                    >
                      0 questions available
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
