with open("src/app/performance/page.tsx", "r") as f:
    c = f.read()

# I will find the fetch for contracts and pacing outside try block and delete it, and put it inside.
bad_block = """
        // Fetch contracts
        const contRes = await fetch("/api/contracts", { headers: { Authorization: `Bearer ${token}` } });
        if (contRes.ok) {
          const contData = await contRes.json();
          setContracts(contData.contracts || []);
        }
"""
c = c.replace(bad_block, "")

good_block = """
        // Fetch contracts
        const contRes = await fetch("/api/contracts", { headers: { Authorization: `Bearer ${token}` } });
        if (contRes.ok) {
          const contData = await contRes.json();
          setContracts(contData.contracts || []);
        }
"""
c = c.replace("      } catch (err) {", good_block + "\n      } catch (err) {")

with open("src/app/performance/page.tsx", "w") as f:
    f.write(c)
