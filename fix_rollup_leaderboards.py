with open("src/app/api/cron/nightly-rollup/route.ts", "r") as f:
    c = f.read()

pacing_logic = """
    // Feature 8: Timed Sectional Pacing Analytics
    await supabaseAdmin.rpc('refresh_pacing_benchmarks');
"""

leaderboard_logic = pacing_logic + """
    // Feature 9: Cohort Leaderboards
    await supabaseAdmin.rpc('refresh_weekly_leaderboards');
"""

c = c.replace(pacing_logic, leaderboard_logic)

with open("src/app/api/cron/nightly-rollup/route.ts", "w") as f:
    f.write(c)
