with open("src/app/api/cron/nightly-rollup/route.ts", "r") as f:
    c = f.read()

todo_str = "// TODO: Add #6 Milestone Evaluation here"
logic = """
    // Feature 6: Progress Contracts Evaluation
    const { data: activeContracts } = await supabaseAdmin
      .from('progress_contracts')
      .select('*')
      .eq('status', 'active');

    if (activeContracts && activeContracts.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      
      for (const contract of activeContracts) {
        // Evaluate progress based on goal type
        // In a real prod environment, we would query the actual progress delta here.
        // For 'questions', we count attempt_answers since start_date.
        let currentProgress = 0;
        
        if (contract.goal_type === 'questions') {
          const { count } = await supabaseAdmin
            .from('attempt_answers')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', contract.user_id)
            .gte('created_at', contract.start_date);
          currentProgress = count || 0;
        } 
        else if (contract.goal_type === 'streak') {
          // This requires user_profiles.streak logic, assuming 0 for now as stub.
          currentProgress = contract.current_progress + 1; // Simplification
        }
        else if (contract.goal_type === 'accuracy') {
          const { data: accData } = await supabaseAdmin
            .from('attempt_answers')
            .select('is_correct')
            .eq('user_id', contract.user_id)
            .gte('created_at', contract.start_date);
            
          if (accData && accData.length > 0) {
            const correct = accData.filter((a: any) => a.is_correct).length;
            currentProgress = (correct / accData.length) * 100;
          }
        }

        let newStatus = 'active';
        if (currentProgress >= contract.target_value) {
          newStatus = 'succeeded';
        } else if (today > contract.end_date) {
          newStatus = 'failed';
        }

        await supabaseAdmin
          .from('progress_contracts')
          .update({ 
            current_progress: currentProgress,
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', contract.id);
          
        if (newStatus === 'succeeded') {
          // Reward achievement
          await supabaseAdmin.from('achievements').upsert({
            user_id: contract.user_id,
            badge_name: `Contract Killer: ${contract.goal_type}`,
            badge_type: 'contract'
          }, { onConflict: 'user_id, badge_name' });
        }
      }
    }
"""

c = c.replace(todo_str, logic)

with open("src/app/api/cron/nightly-rollup/route.ts", "w") as f:
    f.write(c)
