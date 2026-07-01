"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { useState, useEffect } from "react";
import { Search, Filter, BookOpen, Target, Flame, ChevronRight, Bookmark } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export default function PracticeTestsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Filters state
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['Polity', 'History']);
  const [difficulty, setDifficulty] = useState("Medium");
  const [searchQuery, setSearchQuery] = useState("");

  const subjects = ["Polity", "History", "Geography", "Economy", "Environment"];

  // Dummy topics fallback
  const fallbackTopics = [
    { id: 1, subject: "Polity", name: "Fundamental Rights", desc: "Articles 12-35, limitations, and recent judgments.", totalQs: 120, attempted: 45 },
    { id: 2, subject: "History", name: "Indian National Movement", desc: "Key events from 1857 to 1947, moderate and extremist phases.", totalQs: 85, attempted: 12 },
    { id: 3, subject: "Polity", name: "Parliamentary System", desc: "Lok Sabha, Rajya Sabha functions, and law-making process.", totalQs: 95, attempted: 0 },
    { id: 4, subject: "Geography", name: "Physical Geography of India", desc: "Himalayas, Northern Plains, Peninsular Plateau.", totalQs: 150, attempted: 110 },
  ];

  const [topics, setTopics] = useState(fallbackTopics);

  useEffect(() => {
    // In a real scenario, fetch unique subjects/topics from Supabase
    // const fetchTopics = async () => { ... }
    // fetchTopics();
    setLoading(false);
  }, []);

  const toggleSubject = (sub: string) => {
    setSelectedSubjects(prev => 
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

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

            {/* Bookmarked Only */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Bookmark className="w-4 h-4" />
                Bookmarked Only
              </div>
              <button 
                onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
                className={`w-10 h-5 rounded-full relative transition-colors ${bookmarkedOnly ? 'bg-primary' : 'bg-white/10'}`}
              >
                <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${bookmarkedOnly ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {/* Subjects */}
            <div className="mb-8">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Subject</h4>
              <div className="space-y-3">
                {subjects.map(sub => (
                  <label key={sub} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedSubjects.includes(sub) ? 'bg-primary border-primary' : 'border-white/20 bg-background group-hover:border-white/40'}`}>
                      {selectedSubjects.includes(sub) && <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className="text-sm text-gray-300">{sub}</span>
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

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Overall Accuracy</p>
                <p className="text-2xl font-bold text-white">68%</p>
              </div>
            </div>
            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Questions Attempted</p>
                <p className="text-2xl font-bold text-white">1,245</p>
              </div>
            </div>
            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <Flame className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Current Streak</p>
                <p className="text-2xl font-bold text-white">14 Days</p>
              </div>
            </div>
          </div>

          {/* Search and Sort */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search topics, keywords..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50"
              />
            </div>
            <div className="flex items-center gap-3 bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3">
              <span className="text-sm text-gray-500">Sort by:</span>
              <select className="bg-transparent text-sm text-white focus:outline-none cursor-pointer">
                <option value="relevance" className="bg-[#1a1a1a]">Relevance</option>
                <option value="popular" className="bg-[#1a1a1a]">Most Popular</option>
                <option value="recent" className="bg-[#1a1a1a]">Recently Added</option>
              </select>
            </div>
          </div>

          {/* Topic Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {topics.map(topic => (
              <div key={topic.id} className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6 flex flex-col hover:border-white/10 transition-colors relative">
                
                <div className="flex justify-between items-start mb-6">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                    <BookOpen className="w-5 h-5 text-gray-400" />
                  </div>
                  <span className="text-xs font-medium bg-white/5 text-gray-300 px-3 py-1 rounded-full border border-white/10">
                    {topic.subject}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2 leading-tight">{topic.name}</h3>
                <p className="text-sm text-gray-400 mb-6 line-clamp-2">{topic.desc}</p>
                
                <div className="mt-auto">
                  <div className="flex justify-between text-xs font-medium mb-2">
                    <span className="text-gray-500">Progress</span>
                    <span className="text-white">{topic.attempted} / {topic.totalQs} Qs</span>
                  </div>
                  <div className="w-full h-1.5 bg-background rounded-full overflow-hidden mb-6 border border-white/5">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${(topic.attempted / topic.totalQs) * 100}%` }} 
                    />
                  </div>
                  
                  <Link 
                    href={`/test-interface?mode=practice&subject=${topic.subject}&topic=${topic.name}&difficulty=${difficulty}`}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors border border-primary/20"
                  >
                    {topic.attempted > 0 ? "Continue Practice" : "Start Practice"}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

        </main>
      </div>
    </ProtectedRoute>
  );
}
