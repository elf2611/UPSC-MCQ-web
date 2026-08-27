import re

with open("src/app/performance/page.tsx", "r") as f:
    c = f.read()

# Add states
c = c.replace(
    'const [contracts, setContracts] = useState<any[]>([]);',
    'const [contracts, setContracts] = useState<any[]>([]);\n  const [pacingData, setPacingData] = useState<{benchmarks: any[], userPacing: any[]}>({ benchmarks: [], userPacing: [] });'
)

# Fetch pacing
fetch_logic = """
        // Fetch pacing
        const paceRes = await fetch("/api/performance/pacing", { headers: { Authorization: `Bearer ${token}` } });
        if (paceRes.ok) {
          setPacingData(await paceRes.json());
        }
"""
c = c.replace('// Fetch contracts', fetch_logic + '        // Fetch contracts')

# Pacing UI (import Clock)
c = c.replace('import { TrendingUp, Award, Flame, ExternalLink, Activity, Target as TargetIcon } from "lucide-react";', 'import { TrendingUp, Award, Flame, ExternalLink, Activity, Target as TargetIcon, Clock } from "lucide-react";')

pacing_ui = """
        {/* Pacing Analytics */}
        <section className="mb-12">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground flex items-center">
                <Clock className="w-6 h-6 mr-3 text-primary" /> Pacing Analytics
              </h2>
              <p className="text-muted-foreground">Compare your speed per question against peers.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pacingData.userPacing.length === 0 && (
              <div className="col-span-full p-8 border border-white/5 border-dashed rounded-2xl flex flex-col items-center justify-center text-center">
                <Clock className="w-8 h-8 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">Complete a few practice tests to generate pacing benchmarks.</p>
              </div>
            )}
            {pacingData.userPacing.map(up => {
              // Find matching global average
              const globalBench = pacingData.benchmarks.find((b: any) => 
                (b.subject_id === up.subject_id || (b.subjects && b.subjects.name === up.subject_name)) && 
                b.score_band === 'global_average'
              );
              
              const top10Bench = pacingData.benchmarks.find((b: any) => 
                (b.subject_id === up.subject_id || (b.subjects && b.subjects.name === up.subject_name)) && 
                b.score_band === 'top_10_percent'
              );

              const userAvg = Math.round(up.avg_time);
              const globalAvg = globalBench ? Math.round(globalBench.avg_time_per_question) : null;
              const top10Avg = top10Bench ? Math.round(top10Bench.avg_time_per_question) : null;

              let statusText = "Avg Speed";
              let statusColor = "text-amber-500";
              let bg = "bg-amber-500/10";
              
              if (globalAvg) {
                if (userAvg < globalAvg * 0.8) {
                  statusText = "Fast";
                  statusColor = "text-green-500";
                  bg = "bg-green-500/10";
                } else if (userAvg > globalAvg * 1.2) {
                  statusText = "Slow";
                  statusColor = "text-red-500";
                  bg = "bg-red-500/10";
                }
              }

              return (
                <div key={up.subject_id} className="bg-card shadow-surface p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-bold font-display text-foreground">{up.subject_name}</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${bg} ${statusColor}`}>
                      {statusText}
                    </span>
                  </div>
                  
                  <div className="flex items-end gap-2 mb-6">
                    <span className={`text-4xl font-display font-bold ${statusColor}`}>{userAvg}</span>
                    <span className="text-sm text-muted-foreground mb-1">sec / Q</span>
                  </div>
                  
                  {globalAvg && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs items-center">
                        <span className="text-muted-foreground">Global Avg</span>
                        <span className="text-foreground font-medium">{globalAvg}s</span>
                      </div>
                      <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                        <div className="h-full bg-white/20 relative">
                          <div className={`absolute top-0 bottom-0 ${userAvg <= globalAvg ? 'bg-green-500' : 'bg-red-500'}`} style={{ left: 0, width: `${Math.min(100, (userAvg / globalAvg) * 50)}%` }} />
                          <div className="absolute top-0 bottom-0 w-0.5 bg-primary left-[50%]" />
                        </div>
                      </div>
                      
                      {top10Avg && (
                        <div className="flex justify-between text-xs items-center mt-2 pt-2 border-t border-white/5">
                          <span className="text-muted-foreground text-amber-500">Top 10% Avg</span>
                          <span className="text-amber-500 font-bold">{top10Avg}s</span>
                        </div>
                      )}
                    </div>
                  )}
                  {!globalAvg && <p className="text-xs text-muted-foreground">Not enough global data yet.</p>}
                </div>
              );
            })}
          </div>
        </section>
"""

c = c.replace('{/* Analytics Row */}', pacing_ui + '\n        {/* Analytics Row */}')

with open("src/app/performance/page.tsx", "w") as f:
    f.write(c)
