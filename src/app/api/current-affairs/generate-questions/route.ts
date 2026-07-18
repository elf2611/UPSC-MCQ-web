import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/auth-verify';
import { callGemini } from '@/lib/ai/gemini';
import { GenerateRequestPayload } from '@/lib/ai/types';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function normalizeHash(text: string): string {
  const normalized = text.toLowerCase().trim().replace(/\s+/g, ' ');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

export async function GET(req: Request) {
  const supabaseAdmin = getSupabaseAdmin();
  // 1. Verify cron secret to prevent unauthorized execution
  const authHeader = req.headers.get('authorization');
  if (
    process.env.CRON_SECRET && 
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  

  try {
    // 2. Claim a pending job for current affairs (if any)
    const { data: jobs, error: fetchJobErr } = await supabaseAdmin
      .from('processing_jobs')
      .select('*')
      .eq('job_type', 'current_affairs')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchJobErr) throw new Error(fetchJobErr.message);
    
    let jobId = jobs?.[0]?.id;
    
    if (jobId) {
      await supabaseAdmin
        .from('processing_jobs')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', jobId);
    } else {
      // If no job was explicitly created by fetch-articles, create one now to track this run
      const { data: newJob } = await supabaseAdmin.from('processing_jobs').insert({
        source_file: `current_affairs_gen_${new Date().toISOString().split('T')[0]}`,
        status: 'processing',
        job_type: 'current_affairs',
      }).select().single();
      jobId = newJob?.id;
    }

    // 3. Fetch unprocessed articles
    const { data: articles, error: articlesErr } = await supabaseAdmin
      .from('daily_current_affairs')
      .select('*')
      .eq('processed', false)
      .limit(10); // Process up to 10 articles per run

    if (articlesErr) throw new Error(articlesErr.message);

    if (!articles || articles.length === 0) {
      await supabaseAdmin
        .from('processing_jobs')
        .update({ status: 'completed', status_message: 'No new articles to process' })
        .eq('id', jobId);
      return NextResponse.json({ message: 'No new articles' });
    }

    let totalGenerated = 0;

    // 4. Generate questions for each article
    for (const article of articles) {
      const payload: GenerateRequestPayload = {
        text: `Source: ${article.title}\n\n${article.source_text}`,
        config: {
          count: 2, // 1-2 questions per article
          difficulty: "Mixed",
          upscLevel: "Prelims",
          subject: "Current Affairs",
          topic: "Daily News",
          language: "English",
          explanationLength: "Medium",
          includeEliminationTips: true,
          autoGenerateTags: true,
          source: 'current-affairs'
        }
      };

      try {
        const questions = await callGemini(payload);
        
        const rowsToInsert = questions.map((q) => {
          const hash = normalizeHash(q.question_text);
          return {
            job_id: jobId, // Link to the processing job
            question_hash: hash,
            question_text: q.question_text,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_option: q.correct_option.toLowerCase(),
            explanation: q.explanation,
            why_a_wrong: q.why_a_wrong || '',
            why_b_wrong: q.why_b_wrong || '',
            why_c_wrong: q.why_c_wrong || '',
            why_d_wrong: q.why_d_wrong || '',
            elimination_tip: q.elimination_tip || '',
            subject: q.subject,
            topic: q.topic,
            subtopic: q.subtopic || '',
            difficulty: q.difficulty.toLowerCase(),
            year: q.year || null,
            source: 'current-affairs',
            status: 'pending', // pending admin approval
            article_date: article.article_date
          };
        });

        if (rowsToInsert.length > 0) {
          // Insert into staged_questions. Using upsert or ignoring duplicates could be done via RPC
          // but for now we'll do a simple insert and catch unique constraint errors if they happen.
          const { error: insertErr } = await supabaseAdmin
            .from('staged_questions')
            .insert(rowsToInsert);
          
          if (!insertErr) {
            totalGenerated += rowsToInsert.length;
          } else {
             console.error(`[Generate Questions] Failed to insert questions for article ${article.id}:`, insertErr);
          }
        }

        // Mark article as processed
        await supabaseAdmin
          .from('daily_current_affairs')
          .update({ processed: true })
          .eq('id', article.id);

      } catch (geminiErr) {
        console.error(`[Generate Questions] Failed to generate for article ${article.id}:`, geminiErr);
      }
    }

    // 5. Update job status
    await supabaseAdmin
      .from('processing_jobs')
      .update({ 
        status: 'completed', 
        status_message: 'Completed successfully',
        questions_generated: totalGenerated,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    return NextResponse.json({ success: true, questions_generated: totalGenerated });
  } catch (error: unknown) {
    console.error('[Generate Questions] Critical Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
