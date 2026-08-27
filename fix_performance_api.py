with open("src/app/performance/page.tsx", "r") as f:
    c = f.read()

fetch_logic = """
        // Fetch contracts
        const contRes = await fetch("/api/contracts", { headers: { Authorization: `Bearer ${token}` } });
        if (contRes.ok) {
          const contData = await contRes.json();
          setContracts(contData.contracts || []);
        }
"""
c = c.replace('} finally {\n        setLoading(false);', fetch_logic + '} finally {\n        setLoading(false);')

with open("src/app/performance/page.tsx", "w") as f:
    f.write(c)
