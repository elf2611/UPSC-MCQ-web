import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
export const dynamic = 'force-dynamic'



export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('pdf') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No PDF file received' }, 
        { status: 400 }
      )
    }
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'PDF is too large. Please upload a PDF under 10MB.' },
        { status: 400 }
      )
    }
    
    // Check file type
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Please upload a PDF file only.' },
        { status: 400 }
      )
    }
    
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Dynamically import pdf-parse to avoid build issues
    const pdfParseModule = await import('pdf-parse')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParse = (pdfParseModule as any).default || pdfParseModule
    
    const pdfData = await pdfParse(buffer)
    const extractedText = pdfData.text?.trim()
    
    if (!extractedText || extractedText.length < 50) {
      return NextResponse.json({
        error: 'Could not extract text from this PDF. ' +
               'It may be a scanned/image-based PDF. ' +
               'Please use a PDF with selectable text, ' +
               'or use the JSON upload option below.'
      }, { status: 422 })
    }
    
    return NextResponse.json({
      text: extractedText,
      pageCount: pdfData.numpages,
      charCount: extractedText.length,
      preview: extractedText.substring(0, 500)
    })
    
  } catch (error: unknown) {
    console.error('PDF extraction error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Extraction failed: ${message}` },
      { status: 500 }
    )
  }
}
