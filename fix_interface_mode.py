with open("src/app/test-interface/interface.tsx", "r") as f:
    c = f.read()

c = c.replace('if (mode === "practice" || mode === "test") {', 'if (mode === "practice" || mode === "test" || mode === "adaptive") {')
c = c.replace("if (mode === 'practice') {", "if (mode === 'practice' || mode === 'adaptive') {")
c = c.replace('if (mode === "practice" && !feedbackMode', 'if ((mode === "practice" || mode === "adaptive") && !feedbackMode')
c = c.replace("{mode === 'practice' && feedbackMode && (", "{(mode === 'practice' || mode === 'adaptive') && feedbackMode && (")
c = c.replace("{!(mode === 'practice' && feedbackMode) ? (", "{!((mode === 'practice' || mode === 'adaptive') && feedbackMode) ? (")
c = c.replace("{mode === 'practice' && answers[currentQ.id]", "{(mode === 'practice' || mode === 'adaptive') && answers[currentQ.id]")
c = c.replace("? 'Check Answer' : 'Save & Next'}", "? 'Check Answer' : 'Save & Next'}")

with open("src/app/test-interface/interface.tsx", "w") as f:
    f.write(c)
