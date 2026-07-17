import { Suspense } from "react";
import ResultsInner from "./results-inner";
import { ErrorBoundary } from "@/components/error-boundary";

export default function ResultsPage() {
  return (
    <ErrorBoundary fallbackMessage="Could not load your test results. Please try again later.">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#121212]">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <ResultsInner />
      </Suspense>
    </ErrorBoundary>
  );
}
