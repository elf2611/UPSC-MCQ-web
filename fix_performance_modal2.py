with open("src/app/performance/page.tsx", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if line.strip() == "<ProtectedRoute>":
        # Check if next lines are broken
        if lines[i+2].strip() == ">":
            # Broken! Let's delete the broken modal completely and reinsert it.
            # Find the end of this broken modal
            end_idx = i
            for j in range(i+2, i+30):
                if lines[j].strip() == ")}":
                    end_idx = j
                    break
            
            # Delete it
            del lines[i+1:end_idx+1]
            
            # Reinsert the full modal
            modal = """
      {showContractModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 z-[100]">
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
            lines.insert(i+1, modal)
            break

with open("src/app/performance/page.tsx", "w") as f:
    f.writelines(lines)
