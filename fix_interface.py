with open("src/app/test-interface/interface.tsx", "r") as f:
    c = f.read()

import_line = 'import { DoubtChatWidget } from "@/components/doubt-chat";\n'
c = c.replace('"use client";\n', '"use client";\n\n' + import_line)

# Let's find the main return statement.
# The component is `export default function TestInterfaceInner() {`
# Inside it, `return (`
return_idx = c.find('return (', c.find('export default function TestInterfaceInner'))

if return_idx != -1:
    # We want to inject it before the last closing tag, or just alongside it.
    # We can inject it before `</div>\n    </div>\n  );\n}`
    # To be safe, we'll find the last `</div>` before the end of the file.
    
    # We need the current question ID.
    # It uses `questions[currentQuestionIndex]?.id`
    injection = '\n      <DoubtChatWidget questionId={questions[currentQuestionIndex]?.id} />\n'
    
    # We'll just replace the last `</div>\n    </div>` with `</div>\n      <DoubtChatWidget questionId={questions[currentQuestionIndex]?.id} />\n    </div>`
    # Let's use regex to find the end of the return statement
    import re
    c = re.sub(r'(</div>\n\s*</>\n\s*\);|</div>\n\s*</div>\n\s*\);)', r'\n      <DoubtChatWidget questionId={questions[currentQuestionIndex]?.id} />\n\1', c)

with open("src/app/test-interface/interface.tsx", "w") as f:
    f.write(c)
