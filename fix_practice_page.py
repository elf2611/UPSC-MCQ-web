with open("src/app/practice-tests/page.tsx", "r") as f:
    c = f.read()

import_line = 'import { StudyPlanCard } from "@/components/ui/study-plan-card";\n'
c = c.replace('"use client";\n', '"use client";\n\n' + import_line)

# Inject the StudyPlanCard before the h1 "Practice Questions"
injection = '<StudyPlanCard />\n          <div className="mb-8">'
c = c.replace('<div className="mb-8">\n            <h1 className="text-4xl', injection + '\n            <h1 className="text-4xl')

with open("src/app/practice-tests/page.tsx", "w") as f:
    f.write(c)
