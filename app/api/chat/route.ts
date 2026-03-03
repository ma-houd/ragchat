import { OpenAIEmbeddings } from '@langchain/openai'
import { ChatOpenAI } from '@langchain/openai'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: Request) {
  try {
    const { question, documentId } = await req.json()

    // 1. Embed question
    const embedder = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    })
    const vector = await embedder.embedQuery(question)

    // 2. Similarity search via SQL brut (évite le problème de sérialisation RPC)
    const { data: chunks, error } = await supabase.rpc('match_embeddings', {
      query_embedding: JSON.stringify(vector),
      match_threshold: 0.3,
      match_count: 3,
      filter_document_id: documentId
    })

    console.log('chunks:', chunks, 'error:', error)

    if (!chunks || chunks.length === 0) {
      return Response.json({
        answer: "Je ne trouve pas cette information dans le document fourni.",
        sources: []
      })
    }

    // 3. Build context
    const context = chunks
      .map((c: any, i: number) => `[${i + 1}] ${c.content}`)
      .join('\n\n')

    // 4. Generate
    const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 })

    const prompt = `Tu es un assistant qui répond UNIQUEMENT en te basant sur le contexte fourni.
Si la réponse n'est pas dans le contexte, réponds : "Je ne trouve pas cette information dans le document fourni."
N'utilise jamais tes connaissances générales.
Cite tes sources avec [1], [2], etc.

Contexte :
${context}

Question : ${question}

Réponse :`

    const response = await llm.invoke(prompt)

    return Response.json({
      answer: response.content,
      sources: chunks.map((c: any, i: number) => ({
        id: i + 1,
        content: c.content.substring(0, 200) + '...'
      }))
    })
  } catch (err: any) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}