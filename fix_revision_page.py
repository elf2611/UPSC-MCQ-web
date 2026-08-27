with open("src/app/revision/page.tsx", "r") as f:
    c = f.read()

c = c.replace("question_text: row.questions.question_text,", "question_text: (row.questions as any).question_text || (row.questions as any)[0]?.question_text,")
c = c.replace("subject: row.questions.subject", "subject: (row.questions as any).subject || (row.questions as any)[0]?.subject")

with open("src/app/revision/page.tsx", "w") as f:
    f.write(c)
