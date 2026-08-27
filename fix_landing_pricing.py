with open("src/app/pricing/page.tsx", "r") as f:
    c = f.read()

pricing_list_old = """              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> Unlimited Mock & Practice Tests</li>
                <li className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> Advanced Score Analytics</li>
                <li className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> Spaced Revision Queue</li>
                <li className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> Daily AI Current Affairs MCQs</li>
              </ul>"""

pricing_list_new = """              <ul className="space-y-4 mb-8">
                <li className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> AI Mains Answer Scoring</li>
                <li className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> Elite Mock Interview Simulator</li>
                <li className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> AI Doubt-Solving Chat</li>
                <li className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> Optional Subjects Test Series</li>
                <li className="flex items-center text-foreground font-medium"><CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" /> Unlimited MCQs & Spaced Revision</li>
              </ul>"""

c = c.replace(pricing_list_old, pricing_list_new)

with open("src/app/pricing/page.tsx", "w") as f:
    f.write(c)
