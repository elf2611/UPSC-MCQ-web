import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/auth-verify';
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { CURRENT_AFFAIRS_SOURCES } from '@/lib/current-affairs/sources';

export const dynamic = 'force-dynamic';

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
    

    let newArticlesCount = 0;

        for (const source of CURRENT_AFFAIRS_SOURCES) {
      console.log(`\n==========================================`);
      console.log(`[Fetch Articles] Queried source: ${source.name} (${source.url})`);
      try {
        const response = await fetch(source.url, { 
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
        });
        if (!response.ok) {
          console.error(`[Fetch Articles] ❌ HTTP Request Failed for ${source.name}: Status ${response.status}`);
          continue;
        }
        console.log(`[Fetch Articles] ✅ HTTP Request Succeeded for ${source.name}`);

        const xmlText = await response.text();
        const $ = cheerio.load(xmlText, { xmlMode: true });
        
        const links = [];
        $('item').each((i, el) => {
          if (i >= 5) return;
          const link = $(el).find('link').text();
          if (link) links.push(link);
        });

        console.log(`[Fetch Articles] 🔍 Extracted ${links.length} article links from ${source.name}`);
        if (links.length === 0) {
          console.warn(`[Fetch Articles] ⚠️ No links found for ${source.name}. Check if RSS XML structure changed.`);
        }

        let duplicatesFiltered = 0;
        let insertedForSource = 0;

        for (const link of links) {
          const { data: existing } = await supabaseAdmin
            .from('daily_current_affairs')
            .select('id')
            .eq('source_url', link)
            .limit(1);

          if (existing && existing.length > 0) {
            duplicatesFiltered++;
            continue;
          }

          const articleRes = await fetch(link, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
          });
          if (!articleRes.ok) {
            console.error(`[Fetch Articles] ❌ Failed to fetch article HTML for ${link}: Status ${articleRes.status}`);
            continue;
          }

          const htmlText = await articleRes.text();
          const doc = new JSDOM(htmlText, { url: link });
          const reader = new Readability(doc.window.document);
          const article = reader.parse();

          if (!article || !article.textContent) {
            console.log(`[Fetch Articles] ⚠️ Parse Failure for ${link}: Readability could not extract content.`);
            continue;
          }
          if (article.textContent.length < 500) {
            console.log(`[Fetch Articles] ⚠️ Skipped ${link}: Extracted content too short (${article.textContent.length} chars).`);
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
            console.error(`[Fetch Articles] ❌ DB Insert Failed for ${link}:`, insertError.message);
          } else {
            insertedForSource++;
            newArticlesCount++;
          }
        }
        
        console.log(`[Fetch Articles] 📊 Summary for ${source.name}:`);
        console.log(`   - Duplicates filtered: ${duplicatesFiltered}`);
        console.log(`   - Actually inserted: ${insertedForSource}`);

      } catch (sourceErr) {
        console.error(`[Fetch Articles] ❌ Exception processing source ${source.name}:`, sourceErr);
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
