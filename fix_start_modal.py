with open("src/app/practice-tests/page.tsx", "r") as f:
    c = f.read()

c = c.replace('const [mode, setMode] = useState<"practice" | "test">("practice");', 'const [mode, setMode] = useState<"practice" | "adaptive" | "test">("practice");')
c = c.replace('{(["practice", "test"] as const).map((m) => (', '{(["practice", "adaptive", "test"] as const).map((m) => (')
c = c.replace('{m === "practice" ? "Practice (Feedback)" : "Test (No Feedback)"}', '{m === "practice" ? "Practice" : m === "adaptive" ? "Adaptive" : "Test (No Feedback)"}')
c = c.replace('className="grid grid-cols-2 gap-2"', 'className="grid grid-cols-3 gap-2"')

with open("src/app/practice-tests/page.tsx", "w") as f:
    f.write(c)
