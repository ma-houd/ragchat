import { NextRequest } from 'next/server'
// @ts-ignore
import pdf from 'pdf-parse/lib/pdf-parse'
import mammoth from 'mammoth'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { OpenAIEmbeddings } from '@langchain/openai'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    // 1. Extract text
    let text = ''
    if (file.type === 'application/pdf') {
      const buffer = await file.arrayBuffer()
      const data = await pdf(Buffer.from(buffer))
      text = data.text
    } else if (file.type.includes('wordprocessingml')) {
      const buffer = await file.arrayBuffer()
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else {
      text = await file.text()
    }

    // 2. Save document
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({ name: file.name })
      .select()
      .single()

    if (docError) throw docError

    // 3. Chunk
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    })
    const chunks = await splitter.createDocuments([text])

    // 4. Embed
    const embedder = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    })
    const vectors = await embedder.embedDocuments(chunks.map(c => c.pageContent))

    // 5. Store — on cast le vecteur en string pgvector
    const rows = chunks.map((chunk, i) => ({
      document_id: doc.id,
      content: chunk.pageContent,
      embedding: JSON.stringify(vectors[i]),
      metadata: chunk.metadata
    }))

    const { error: embedError } = await supabase
      .from('embeddings')
      .insert(rows)

    if (embedError) throw embedError

    return Response.json({ success: true, documentId: doc.id, chunks: chunks.length })
  } catch (err: any) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}