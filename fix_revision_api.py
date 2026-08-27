with open("src/app/api/questions/route.ts", "r") as f:
    c = f.read()

# Inside POST function:
logic = """    if (mode === 'revision') {
      let query = supabaseAdmin.from('revision_queue').select('question_id').eq('user_id', authResult.uid);
      // Wait, we need to fetch the actual questions.
      const { data: revData } = await query;
      if (revData && revData.length > 0) {
        const qIds = revData.map(r => r.question_id);
        const { data: qData } = await supabaseAdmin.from('questions').select("id, subject_id, subject, topic, subtopic, question_text, option_a, option_b, option_c, option_d, difficulty, year").in('id', qIds).limit(limit);
        return NextResponse.json({ questions: qData || [] });
      } else {
        return NextResponse.json({ questions: [] });
      }
    }
"""

c = c.replace("    let limit = 10;", logic + "    let limit = 10;")

with open("src/app/api/questions/route.ts", "w") as f:
    f.write(c)
