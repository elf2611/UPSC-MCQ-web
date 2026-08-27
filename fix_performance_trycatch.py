import re
with open("src/app/performance/page.tsx", "r") as f:
    c = f.read()

# I will find the pacing and contract block and move it
block = """      
        
        // Fetch pacing
        const paceRes = await fetch("/api/performance/pacing", { headers: { Authorization: `Bearer ${token}` } });
        if (paceRes.ok) {
          setPacingData(await paceRes.json());
        }
        // Fetch contracts
        const contRes = await fetch("/api/contracts", { headers: { Authorization: `Bearer ${token}` } });
        if (contRes.ok) {
          const contData = await contRes.json();
          setContracts(contData.contracts || []);
        }"""

c = c.replace(block, "")

# Now insert it at the end of the try block, right before catch (err)
c = c.replace("      } catch (err) {", block + "\n      } catch (err) {")

with open("src/app/performance/page.tsx", "w") as f:
    f.write(c)
