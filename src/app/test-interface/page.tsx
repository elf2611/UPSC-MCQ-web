import { Suspense } from "react";
import TestInterfaceInner from "./interface";

export default function TestInterfacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <TestInterfaceInner />
    </Suspense>
  );
}
