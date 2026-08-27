with open("src/app/api/cron/nightly-rollup/route.ts", "r") as f:
    c = f.read()

# I need to insert the logic for #5 right where the TODO is.
todo_str = "// TODO: Add #5 Revision Queue auto-adds and #6 Milestone Evaluation here"

logic = """
    // Feature 5: Weak-Topic Diagnostic -> Auto-Revision Queue
    if (attempts && attempts.length > 0) {
      // Find questions answered wrong yesterday
      const wrongAttempts = attempts.filter((a: any) => !a.is_correct);
      
      for (const attempt of wrongAttempts) {
        // Check historical attempts for this user and question
        const { data: history } = await supabaseAdmin
          .from('attempt_answers')
          .select('id, is_correct')
          .eq('user_id', attempt.user_id)
          .eq('question_id', attempt.question_id);
          
        if (history) {
          const wrongCount = history.filter(h => !h.is_correct).length;
          
          if (wrongCount >= 2) {
            // Upsert to revision queue
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            await supabaseAdmin
              .from('revision_queue')
              .upsert({
                user_id: attempt.user_id,
                question_id: attempt.question_id,
                source: 'auto_wrong_twice',
                next_review_date: tomorrow.toISOString().split('T')[0],
                weakness_score: wrongCount * 10
              }, { onConflict: 'user_id, question_id' });
          }
        }
      }
      
      // Auto-Stale logic: check questions answered correct > 14 days ago and not in revision queue
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const { data: staleAttempts } = await supabaseAdmin
        .from('attempt_answers')
        .select('user_id, question_id')
        .eq('is_correct', true)
        .lt('created_at', twoWeeksAgo.toISOString())
        .limit(100); // Batching in reality
        
      if (staleAttempts) {
        for (const stale of staleAttempts) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          await supabaseAdmin
            .from('revision_queue')
            .upsert({
              user_id: stale.user_id,
              question_id: stale.question_id,
              source: 'auto_stale',
              next_review_date: tomorrow.toISOString().split('T')[0]
            }, { onConflict: 'user_id, question_id', ignoreDuplicates: true });
        }
      }
    }
    
    // TODO: Add #6 Milestone Evaluation here
"""

c = c.replace(todo_str, logic)

with open("src/app/api/cron/nightly-rollup/route.ts", "w") as f:
    f.write(c)
