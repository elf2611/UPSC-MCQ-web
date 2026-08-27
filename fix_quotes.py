with open("src/app/page.tsx", "r") as f:
    c = f.read()

c = c.replace("Nothing you don't.", "Nothing you don&apos;t.")
c = c.replace("Prepwise's analytics", "Prepwise&apos;s analytics")
c = c.replace("coaching institute's test series", "coaching institute&apos;s test series")
c = c.replace("I've found online.", "I&apos;ve found online.")

with open("src/app/page.tsx", "w") as f:
    f.write(c)
