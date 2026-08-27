
import Link from "next/link";
import { PenTool, Clock, Award } from "lucide-react";
import { ProtectedRoute } from "@/components/protected-route";

export default function MainsPracticePage() {
  const dummyQuestions = [
    { id: 'q1', paper: 'GS-2', topic: 'Polity', marks: 15, words: 250, text: 'Analyze the role of the Election Commission of India in ensuring free and fair elections. What are the recent challenges it faces?' },
    { id: 'q2', paper: 'GS-3', topic: 'Economy', marks: 10, words: 150, text: 'Examine the impact of digital public infrastructure on financial inclusion in India.' }
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0B0B0F] py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold font-display text-foreground mb-4">Mains Answer Writing</h1>
            <p className="text-xl text-muted-foreground">Practice subjective answers with instant AI-driven rubric grading.</p>
          </div>

          <div className="grid gap-6">
            {dummyQuestions.map(q => (
              <div key={q.id} className="bg-card shadow-surface p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-colors group">
                <div className="flex flex-wrap gap-3 mb-4">
                  <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">{q.paper}</span>
                  <span className="px-3 py-1 bg-white/5 text-muted-foreground text-xs font-bold rounded-full">{q.topic}</span>
                </div>
                <h3 className="text-lg font-medium text-foreground mb-6 leading-relaxed">
                  {q.text}
                </h3>
                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <div className="flex gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center"><Award className="w-4 h-4 mr-1 text-primary" /> {q.marks} Marks</span>
                    <span className="flex items-center"><PenTool className="w-4 h-4 mr-1 text-primary" /> {q.words} Words</span>
                    <span className="flex items-center"><Clock className="w-4 h-4 mr-1 text-primary" /> {q.marks === 15 ? '11 mins' : '7 mins'} target</span>
                  </div>
                  <Link 
                    href={`/mains-practice/${q.id}`}
                    className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-lg shadow-md hover:bg-primary/90 transition-colors"
                  >
                    Write Answer
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
