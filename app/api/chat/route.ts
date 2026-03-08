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

    if (!chunks || chunks.length === 0) {
      return new Response("I can't find this information from the given document.", {
        headers: { 
          "Content-Type": "text/plain",
          "X-Sources": Buffer.from(JSON.stringify([])).toString('base64')
        }
      })
    }

    // 3. Build context
    const context = chunks
      .map((c: any, i: number) => `[${i + 1}] ${c.content}`)
      .join('\n\n')

    //4. Generate
    const llm = new ChatOpenAI({ 
      modelName: 'gpt-4o-mini', 
      temperature: 0,
      streaming: true 
    })

    const prompt = `You are an assistant which answers ONLY based on the given context.
    If the answer is not in the context, answer : "I can't find this information from the given document."
    Never use your general knowledge.
    Cite your sources with [1], [2], etc.

    Context :
    ${context}

    Question : ${question}

    Answer :`

    const stream = await llm.stream(prompt)

    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.content as string
          if (text) controller.enqueue(new TextEncoder().encode(text))
        }
        controller.close()
      }
    })


    const sourcesData = chunks.map((c: any, i: number) => ({
      id: i + 1,
      content: c.content.substring(0, 200) + '...'
    }))

    return new Response(readableStream, {
      headers: { 
        "Content-Type": "text/plain",
        "X-Sources": Buffer.from(JSON.stringify(chunks.map((c: any, i: number) => ({
          id: i + 1,
          content: c.content.substring(0, 200) + '...'
        })))).toString('base64')
      }
    })
  } catch (err: any) {
    console.error(err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}