with open("src/app/optionals/page.tsx", "r") as f:
    c = f.read()

# Change the title and empty state text
c = c.replace('Practice Subjects', 'Optional Subjects')
c = c.replace('Choose a subject to start practicing mock questions.', 'Master your UPSC Optional Subjects with dedicated mock tests.')
c = c.replace('No subjects found matching your criteria.', 'No optional subjects available yet.')

# Filter taxonomy to only optionals
c = c.replace('setTaxonomy(taxData);', 'setTaxonomy({...taxData, subjects: taxData.subjects.filter((s: any) => s.is_optional)});\n        // We also want to provide mock optionals if none exist\n        if (!taxData.subjects.some((s: any) => s.is_optional)) {\n          setTaxonomy(prev => ({\n            ...prev,\n            subjects: [{ id: "opt-1", name: "Sociology", slug: "sociology", is_optional: true }, { id: "opt-2", name: "Geography", slug: "geography", is_optional: true }, {id: "opt-3", name: "PSIR", slug: "psir", is_optional: true}]\n          }));\n        }')

# We also need to change the function name just in case, though Next.js doesn't strictly care if it's default exported
c = c.replace('export default function PracticeTestsPage()', 'export default function OptionalsPage()')

with open("src/app/optionals/page.tsx", "w") as f:
    f.write(c)
