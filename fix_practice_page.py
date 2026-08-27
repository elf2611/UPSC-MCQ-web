with open("src/app/practice-tests/page.tsx", "r") as f:
    c = f.read()

c = c.replace('setTaxonomy(taxData);', 'setTaxonomy({...taxData, subjects: taxData.subjects.filter((s: any) => !s.is_optional)});')

with open("src/app/practice-tests/page.tsx", "w") as f:
    f.write(c)
