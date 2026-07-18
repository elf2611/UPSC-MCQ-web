import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/auth-verify';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { handleApiError } from '@/lib/logger';
import { verifyAdminToken } from '@/lib/auth-verify';

export const dynamic = 'force-dynamic';



export async function GET(request: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const authResult = await verifyAdminToken(request);
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error, detail: authResult.detail },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv'; // csv, json, xlsx
    const subject = searchParams.get('subject');
    const topic = searchParams.get('topic');
    const difficulty = searchParams.get('difficulty');

    let query = supabaseAdmin.from('questions').select('*');

    if (subject && subject !== 'all') query = query.eq('subject', subject);
    if (topic && topic !== 'all') query = query.eq('topic', topic);
    if (difficulty && difficulty !== 'all') query = query.eq('difficulty', difficulty);

    // Limit to 20k rows to prevent memory crashes on Hobby plan, or paginate if needed.
    const { data: questions, error } = await query.limit(20000);

    if (error) throw new Error(error.message);
    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'No questions found for the given filters.' }, { status: 404 });
    }

    // Clean data (remove FTS column or unnecessary internal fields if needed)
    const exportData = questions.map(q => {
      const copy = { ...q };
      delete copy.fts;
      delete copy.question_hash;
      return copy;
    });

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `prepwise_export_${timestamp}`;

    if (format === 'json') {
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        },
      });
    } else if (format === 'csv') {
      const csvString = Papa.unparse(exportData);
      return new NextResponse(csvString, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      });
    } else if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });

  } catch (err: unknown) {
    const errorResponse = handleApiError('/api/admin/export', err);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
