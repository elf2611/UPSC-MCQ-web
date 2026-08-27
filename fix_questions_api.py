with open("src/app/api/questions/route.ts", "r") as f:
    c = f.read()

import_line = "    const { mode, subject, topic, subtopic, difficulty, testId, customCount, date, year } = await request.json();\n    const supabaseAdmin = getSupabaseAdmin();\n\n    let abilityScore = 1200.0;\n    if (mode === 'adaptive') {\n      const { data: stats } = await supabaseAdmin.from('user_statistics').select('rolling_ability_score').eq('user_id', authResult.uid).eq('subject_id', subject).single();\n      if (stats?.rolling_ability_score) abilityScore = stats.rolling_ability_score;\n    }"
c = c.replace("    const { mode, subject, topic, subtopic, difficulty, testId, customCount, date, year } = await request.json();\n    const supabaseAdmin = getSupabaseAdmin();", import_line)

rpc_call = "      p_date: date || null,\n      p_mode: mode || 'practice',\n      p_limit: limit,\n      p_ability_score: abilityScore"
c = c.replace("      p_date: date || null,\n      p_mode: mode || 'practice',\n      p_limit: limit", rpc_call)

with open("src/app/api/questions/route.ts", "w") as f:
    f.write(c)
