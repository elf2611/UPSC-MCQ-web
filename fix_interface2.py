with open("src/app/test-interface/interface.tsx", "r") as f:
    c = f.read()

injection = '\n      <DoubtChatWidget questionId={questions[currentQuestionIndex]?.id} />\n'
c = c.replace('    </div>\n  );\n}', injection + '    </div>\n  );\n}')

with open("src/app/test-interface/interface.tsx", "w") as f:
    f.write(c)
