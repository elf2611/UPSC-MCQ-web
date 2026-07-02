"use client";

import { useMemo } from "react";

function generatePast90Days() {
  const dates = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

const getHeatmapColor = (count: number) => {
  if (count === 0) return "bg-zinc-800 border-zinc-700";
  if (count <= 5) return "bg-amber-900 border-amber-800";
  if (count <= 15) return "bg-amber-700 border-amber-600";
  return "bg-amber-500 border-amber-400";
};

export function ActivityHeatmap({ heatmapMap, title = "90-Day Activity" }: { heatmapMap: Record<string, number>; title?: string }) {
  const dates90 = useMemo(() => generatePast90Days(), []);

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-300 mb-4">{title}</h4>
      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
        {/* Divide 90 days into columns of 7 */}
        {Array.from({ length: 13 }).map((_, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-1">
            {Array.from({ length: 7 }).map((_, rowIndex) => {
              const dayIndex = colIndex * 7 + rowIndex;
              if (dayIndex >= 90) return <div key={rowIndex} className="w-3 h-3" />; // Empty placeholder
              
              const dateStr = dates90[dayIndex];
              const count = heatmapMap[dateStr] || 0;
              
              return (
                <div 
                  key={dateStr}
                  title={`${dateStr}: ${count} questions`}
                  className={`w-3 h-3 rounded-sm border-[0.5px] ${getHeatmapColor(count)} cursor-help transition-colors hover:ring-1 hover:ring-white`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center mt-3 text-xs text-gray-500 px-1">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-zinc-800" />
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-900" />
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-700" />
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
