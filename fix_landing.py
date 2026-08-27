import re

# 1. Update fonts in layout.tsx
with open("src/app/layout.tsx", "r") as f:
    layout = f.read()

layout = layout.replace('import { Inter, Space_Grotesk } from "next/font/google";', 'import { Plus_Jakarta_Sans, Outfit } from "next/font/google";')
layout = layout.replace("""const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
});""", """const sans = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: "--font-sans",
});""")
layout = layout.replace("""const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});""", """const display = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
});""")
layout = layout.replace('${inter.variable} ${spaceGrotesk.variable}', '${sans.variable} ${display.variable}')

with open("src/app/layout.tsx", "w") as f:
    f.write(layout)
