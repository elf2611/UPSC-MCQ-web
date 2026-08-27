with open("src/app/api/cron/nightly-rollup/route.ts", "r") as f:
    c = f.read()

# Add pacing logic at the end before returning success
pacing_logic = """
    // Feature 8: Timed Sectional Pacing Analytics
    // Let Postgres handle the heavy aggregation
    await supabaseAdmin.rpc('refresh_pacing_benchmarks');
"""

c = c.replace('return NextResponse.json({ success: true, message: "Rollup completed." });', pacing_logic + '\n    return NextResponse.json({ success: true, message: "Rollup completed." });')

with open("src/app/api/cron/nightly-rollup/route.ts", "w") as f:
    f.write(c)
