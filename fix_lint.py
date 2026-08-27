with open("src/app/page.tsx", "r") as f:
    c = f.read()

# Fix unused imports
c = c.replace("BrainCircuit, Target, BarChart3, Newspaper, RefreshCcw, ShieldCheck, Zap, Trophy, Quote, PlayCircle, TrendingUp, Search, History", "Target, BarChart3, Newspaper, ShieldCheck, Trophy, Quote, PlayCircle, TrendingUp, Search, History")

# Fix unused variables/functions
# Since we might not use CountUp, let's just comment it out
import re
c = re.sub(r'function CountUp.*?return <span ref=\{ref\}>\{count\}\{suffix\}</span>;\n}', '', c, flags=re.DOTALL)

# Fix unused valueVisible (remove it if it's there)
# Actually, wait, valueVisible is used for the Pricing section right?
# Let's check if it's used. In the rewritten page, I did `ref={valueRef}` but didn't use `valueVisible`.
# Let's change the Pricing section to use valueVisible or remove it.
c = c.replace('const { ref: valueRef, isVisible: valueVisible } = useScrollReveal(0.1);', 'const { ref: valueRef } = useScrollReveal(0.1);')


# Fix quotes
c = c.replace('explicit "why wrong" breakdowns', 'explicit &quot;why wrong&quot; breakdowns')
c = c.replace("review with 'why wrong', and precise", "review with &apos;why wrong&apos;, and precise")
c = c.replace("What if I'm a beginner", "What if I&apos;m a beginner")


with open("src/app/page.tsx", "w") as f:
    f.write(c)
