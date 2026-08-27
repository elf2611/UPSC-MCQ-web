with open("src/app/performance/page.tsx", "r") as f:
    c = f.read()

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

c = c.replace('  if (loading) return (', submit_logic + '\n  if (loading) return (')

with open("src/app/performance/page.tsx", "w") as f:
    f.write(c)
