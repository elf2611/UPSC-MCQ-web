import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { CURRENT_AFFAIRS_SOURCES } from '@/lib/current-affairs/sources';

export async function GET(req: Request) {
  // 1. Verify cron secret to prevent unauthorized execution
  const authHeader = req.headers.get('authorization');
  if (
    process.env.CRON_SECRET && 
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let newArticlesCount = 0;

    for (const source of CURRENT_AFFAIRS_SOURCES) {
      console.log(`[Fetch Articles] Processing source: ${source.name}`);
      try {
        const response = await fetch(source.url, { 
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
        });
        if (!response.ok) {
          console.error(`Failed to fetch RSS from ${source.name}: ${response.status}`);
          continue;
        }

        const xmlText = await response.text();
        const $ = cheerio.load(xmlText, { xmlMode: true });
        
        // Extract links from items
        const links: string[] = [];
        $('item').each((i, el) => {
          if (i >= 5) return; // Only process the latest 5 articles per source
          const link = $(el).find('link').text();
          if (link) links.push(link);
        });

        for (const link of links) {
          // Check if article already exists
          const { data: existing } = await supabaseAdmin
            .from('daily_current_affairs')
            .select('id')
            .eq('source_url', link)
            .limit(1);

          if (existing && existing.length > 0) {
            continue; // Skip already processed article
          }

          // Fetch the article HTML
          const articleRes = await fetch(link, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
          });
          if (!articleRes.ok) continue;

          const htmlText = await articleRes.text();
          
          // Use jsdom and readability to extract clean text
          const doc = new JSDOM(htmlText, { url: link });
          const reader = new Readability(doc.window.document);
          const article = reader.parse();

          if (!article || !article.textContent || article.textContent.length < 500) {
            console.log(`[Fetch Articles] Skipped ${link} (too short or unreadable)`);
            continue;
          }

          const { error: insertError } = await supabaseAdmin
            .from('daily_current_affairs')
            .insert({
              title: article.title || 'Untitled',
              source_url: link,
              source_text: article.textContent.trim(),
            });

          if (insertError) {
            console.error(`[Fetch Articles] Failed to insert article ${link}:`, insertError);
          } else {
            newArticlesCount++;
          }
        }
      } catch (sourceErr) {
        console.error(`[Fetch Articles] Error processing source ${source.name}:`, sourceErr);
      }
    }

    // If new articles were found, create a processing job for generate-questions
    // Or we could just let the next cron generate questions blindly.
    // For visibility, let's create a processing job right now so the admin sees it.
    if (newArticlesCount > 0) {
      await supabaseAdmin.from('processing_jobs').insert({
        source_file: `current_affairs_${new Date().toISOString().split('T')[0]}`,
        status: 'waiting',
        job_type: 'current_affairs',
        chunk_start_page: 0,
        chunk_end_page: newArticlesCount
      });
    }

    return NextResponse.json({ 
      success: true, 
      new_articles_count: newArticlesCount 
    });

  } catch (error: unknown) {
    console.error('[Fetch Articles] Critical Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
