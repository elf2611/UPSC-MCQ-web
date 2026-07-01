import { Suspense } from "react";
import ResultsInner from "./results-inner";

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ResultsInner />
    </Suspense>
  );
}
