import { useState } from "react";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";

interface AIExplanationButtonProps {
  questionData: {
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: string;
  };
}

export function AIExplanationButton({ questionData }: AIExplanationButtonProps) {
  const [explanation, setExplanation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExplanation = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/questions/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(questionData),
      });

      if (!response.ok) {
        throw new Error("Failed to generate explanation");
      }

      const data = await response.json();
      setExplanation(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load AI explanation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 border border-indigo-500/30 rounded-xl bg-indigo-950/20 p-4 relative overflow-hidden">
      {!explanation && !loading && (
        <button 
          onClick={fetchExplanation} 
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition font-medium text-sm"
        >
          <Sparkles className="w-4 h-4" />
          Get Detailed AI Explanation
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-indigo-400 font-medium text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating AI Explanation... (May take a few seconds)
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm mt-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {explanation && (
        <div className="space-y-4 text-sm animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 mb-4 border-b border-indigo-500/20 pb-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h4 className="font-bold text-indigo-300">AI Analysis</h4>
          </div>

          <div>
            <h4 className="font-bold text-green-400 mb-1">✅ Why is it correct?</h4>
            <p className="text-zinc-300 leading-relaxed">{explanation.correct_explanation}</p>
          </div>
          
          {explanation.why_others_wrong && Object.keys(explanation.why_others_wrong).length > 0 && (
            <div>
              <h4 className="font-bold text-red-400 mb-1">❌ Why are others wrong?</h4>
              <ul className="space-y-2">
                {Object.entries(explanation.why_others_wrong).map(([opt, reason]: [string, any]) => (
                  <li key={opt} className="text-zinc-300">
                    <strong className="text-zinc-400 mr-2">{opt}:</strong> {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {explanation.elimination_technique && (
            <div className="bg-amber-950/30 border-l-4 border-amber-500/50 p-3 mt-4 rounded-r-md">
              <h4 className="font-bold text-amber-400 mb-1">🕵️ Elimination Strategy</h4>
              <p className="text-amber-100/80 leading-relaxed">{explanation.elimination_technique}</p>
            </div>
          )}

          {explanation.memory_trick && (
            <div className="bg-blue-950/30 border-l-4 border-blue-500/50 p-3 mt-2 rounded-r-md">
              <h4 className="font-bold text-blue-400 mb-1">🧠 Memory Trick</h4>
              <p className="text-blue-100/80 leading-relaxed">{explanation.memory_trick}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
