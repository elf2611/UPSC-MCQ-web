import { NextRequest, NextResponse } from 'next/server';
import { verifyUserToken, getSupabaseAdmin } from '@/lib/auth-verify';

export async function GET(request: NextRequest) {
  const authResult = await verifyUserToken(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { uid } = authResult;
    const todayStr = new Date().toISOString().split("T")[0];

    // Fetch due questions
    const { data: qData, error: qError } = await supabaseAdmin
      .from("revision_queue")
      .select("*, questions(*)")
      .eq("user_id", uid)
      .lte("next_review_date", todayStr);

    if (qError) throw new Error(qError.message);

    let nextReviewDate = null;

    if (!qData || qData.length === 0) {
      const { data: future } = await supabaseAdmin
        .from("revision_queue")
        .select("next_review_date")
        .eq("user_id", uid)
        .gt("next_review_date", todayStr)
        .order("next_review_date", { ascending: true })
        .limit(1);

      if (future && future.length > 0) {
        const futureDate = new Date(future[0].next_review_date);
        const diffTime = futureDate.getTime() - new Date().getTime();
        nextReviewDate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    // Fetch heatmap data (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyStr = ninetyDaysAgo.toISOString().split("T")[0];

    const { data: hData } = await supabaseAdmin
      .from("question_attempts")
      .select("attempt_date")
      .eq("user_id", uid)
      .gte("attempt_date", ninetyStr);

    const counts: Record<string, number> = {};
    if (hData) {
      hData.forEach(row => {
        counts[row.attempt_date] = (counts[row.attempt_date] || 0) + 1;
      });
    }

    return NextResponse.json({
        queue: qData || [],
        nextReviewDate,
        heatmapMap: counts
    });

  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await verifyUserToken(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { action, id, interval_days, ease_factor, repetitions, next_review_date, question_id, is_correct, earnedXp } = await request.json();
    const supabaseAdmin = getSupabaseAdmin();
    const { uid } = authResult;

    if (action === 'update_confidence') {
        // Update Revision Queue
        await supabaseAdmin.from("revision_queue").update({
            interval_days,
            ease_factor,
            repetitions,
            next_review_date,
            updated_at: new Date().toISOString()
        }).eq("id", id).eq("user_id", uid); // secure eq user_id

        // Update Profile XP
        const { error: rpcError } = await supabaseAdmin.rpc('increment_xp', { user_id: uid, xp_amount: earnedXp });
        if (rpcError) {
            const { data } = await supabaseAdmin.from("profiles").select("xp").eq("id", uid).single();
            if (data) {
                await supabaseAdmin.from("profiles").update({ xp: data.xp + earnedXp }).eq("id", uid);
            }
        }

        // Log Attempt
        const todayStr = new Date().toISOString().split("T")[0];
        await supabaseAdmin.from("question_attempts").insert({
            user_id: uid,
            question_id,
            is_correct,
            attempt_date: todayStr
        });
        
        return NextResponse.json({ success: true });
    }

    if (action === 'upsert') {
        // use destructured variables from line 78
        await supabaseAdmin.from("revision_queue").upsert({
            user_id: uid,
            question_id,
            interval_days,
            next_review_date,
            updated_at: new Date().toISOString()
        }, { onConflict: "user_id, question_id" });
        return NextResponse.json({ success: true });
    }

    if (action === 'batch_update_confidence') {
        const { updates } = await request.json();
        const todayStr = new Date().toISOString().split("T")[0];

        let totalXp = 0;
        const attemptsToInsert = [];

        for (const update of updates) {
            await supabaseAdmin.from("revision_queue").update({
                interval_days: update.interval_days,
                ease_factor: update.ease_factor,
                repetitions: update.repetitions,
                next_review_date: update.next_review_date,
                updated_at: new Date().toISOString()
            }).eq("id", update.id).eq("user_id", uid);

            totalXp += update.earnedXp;

            attemptsToInsert.push({
                user_id: uid,
                question_id: update.question_id,
                is_correct: update.is_correct,
                attempt_date: todayStr
            });
        }

        if (totalXp > 0) {
            const { error: rpcError } = await supabaseAdmin.rpc('increment_xp', { user_id: uid, xp_amount: totalXp });
            if (rpcError) {
                const { data } = await supabaseAdmin.from("profiles").select("xp").eq("id", uid).single();
                if (data) {
                    await supabaseAdmin.from("profiles").update({ xp: data.xp + totalXp }).eq("id", uid);
                }
            }
        }

        if (attemptsToInsert.length > 0) {
            await supabaseAdmin.from("question_attempts").insert(attemptsToInsert);
        }

        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
