with open("src/app/performance/page.tsx", "r") as f:
    c = f.read()

# Add state
c = c.replace(
    'const [loading, setLoading] = useState(true);',
    'const [loading, setLoading] = useState(true);\n  const [contracts, setContracts] = useState<any[]>([]);\n  const [showContractModal, setShowContractModal] = useState(false);\n  const [contractForm, setContractForm] = useState({ goalType: "questions", targetValue: 500, durationDays: 30 });'
)

# Fetch contracts
fetch_logic = """
        const contRes = await fetch("/api/contracts", { headers: { Authorization: `Bearer ${token}` } });
        if (contRes.ok) {
          const contData = await contRes.json();
          setContracts(contData.contracts || []);
        }
"""
c = c.replace('if (!res.ok) throw new Error("Failed to fetch dashboard stats");', 'if (!res.ok) throw new Error("Failed to fetch dashboard stats");\n' + fetch_logic)

# Contract Creation Logic
submit_logic = """
  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(contractForm)
      });
      if (res.ok) {
        setShowContractModal(false);
        // Quick reload by refetching
        const contRes = await fetch("/api/contracts", { headers: { Authorization: `Bearer ${token}` } });
        if (contRes.ok) {
          const contData = await contRes.json();
          setContracts(contData.contracts || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };
"""
c = c.replace('if (loading) {', submit_logic + '\n  if (loading) {')

# The Modal UI
modal_ui = """
      {showContractModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card shadow-surface rounded-2xl p-8 w-full max-w-md shadow-2xl border border-white/5">
            <h2 className="text-xl font-display font-bold text-foreground mb-6 flex items-center">
              <TargetIcon className="w-5 h-5 text-primary mr-2" /> New Progress Contract
            </h2>
            <form onSubmit={handleCreateContract} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Goal Type</label>
                <select 
                  className="w-full bg-background border border-white/10 rounded-lg p-3 text-foreground"
                  value={contractForm.goalType}
                  onChange={e => setContractForm({...contractForm, goalType: e.target.value})}
                >
                  <option value="questions">Total Questions Solved</option>
                  <option value="accuracy">Average Accuracy (%)</option>
                  <option value="streak">Daily Streak</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Target Value</label>
                <input 
                  type="number" 
                  className="w-full bg-background border border-white/10 rounded-lg p-3 text-foreground"
                  value={contractForm.targetValue}
                  onChange={e => setContractForm({...contractForm, targetValue: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowContractModal(false)} className="px-4 py-2 text-muted-foreground hover:text-foreground">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground font-bold rounded-lg hover:bg-primary/90">Sign Contract</button>
              </div>
            </form>
          </div>
        </div>
      )}
"""
c = c.replace('return (\n    <ProtectedRoute>', 'return (\n    <ProtectedRoute>\n' + modal_ui)

# Contract Section UI
contract_ui = """
        {/* Progress Contracts */}
        <section className="mb-12">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-display font-bold text-foreground">Progress Contracts</h2>
              <p className="text-muted-foreground">Commit to a goal. Reach it to unlock exclusive badges.</p>
            </div>
            <button onClick={() => setShowContractModal(true)} className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary/20 transition-colors">
              + New Contract
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contracts.length === 0 && (
              <div className="col-span-full p-8 border border-white/5 border-dashed rounded-2xl flex flex-col items-center justify-center text-center">
                <TargetIcon className="w-8 h-8 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">No active contracts. Sign one to push your limits!</p>
              </div>
            )}
            {contracts.map(contract => {
              const progressPct = Math.min(100, Math.round((contract.current_progress / contract.target_value) * 100));
              const daysLeft = Math.max(0, Math.ceil((new Date(contract.end_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24)));
              return (
                <div key={contract.id} className="bg-card shadow-surface p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                  <div className={`absolute top-0 right-0 w-32 h-32 blur-[50px] rounded-full pointer-events-none transition-opacity ${contract.status === 'succeeded' ? 'bg-green-500/20' : contract.status === 'failed' ? 'bg-red-500/20' : 'bg-primary/10'}`} />
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <span className="bg-white/5 text-muted-foreground text-xs font-bold px-2 py-1 rounded capitalize">{contract.goal_type}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${contract.status === 'succeeded' ? 'bg-green-500/20 text-green-400' : contract.status === 'failed' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-500'}`}>
                      {contract.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold font-display text-foreground mb-1 relative z-10">Target: {contract.target_value}</h3>
                  <p className="text-sm text-muted-foreground mb-6 relative z-10">{daysLeft} days remaining</p>
                  
                  <div className="relative z-10">
                    <div className="flex justify-between text-xs font-medium mb-2">
                      <span className="text-foreground">{contract.current_progress} / {contract.target_value}</span>
                      <span className="text-primary">{progressPct}%</span>
                    </div>
                    <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                      <div className={`h-full transition-all ${contract.status === 'succeeded' ? 'bg-green-400' : contract.status === 'failed' ? 'bg-red-400' : 'bg-primary'}`} style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
"""

c = c.replace('{/* Weak Topics Diagnostic */}', contract_ui + '\n        {/* Weak Topics Diagnostic */}')

with open("src/app/performance/page.tsx", "w") as f:
    f.write(c)
