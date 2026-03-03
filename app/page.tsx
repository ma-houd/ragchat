'use client'

import { useState } from 'react'

export default function Home() {
  const [uploading, setUploading] = useState(false)
  const [documentId, setDocumentId] = useState<string | null>(null)
  
  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploading(true)
    
    const formData = new FormData(e.currentTarget)
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
    
    const data = await res.json()
    setDocumentId(data.documentId)
    setUploading(false)
  }
  
  if (documentId) {
    return <ChatInterface documentId={documentId} />
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleUpload} className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">DocuChat</h1>
        <p className="text-gray-600 mb-6">
          Upload a document and ask questions about it
        </p>
        <input 
          type="file" 
          name="file"
          accept=".pdf,.docx,.txt"
          required
          className="mb-4"
        />
        <button 
          type="submit"
          disabled={uploading}
          className="w-full bg-blue-600 text-white py-2 rounded"
        >
          {uploading ? 'Processing...' : 'Upload'}
        </button>
      </form>
    </div>
  )
}

function ChatInterface({ documentId }: { documentId: string }) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const userMessage = { role: 'user', content: question }
    setMessages(prev => [...prev, userMessage])
    
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, documentId })
    })
    
    const data = await res.json()
    
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: data.answer,
      sources: data.sources
    }])
    
    setQuestion('')
    setLoading(false)
  }
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`p-4 rounded ${
            msg.role === 'user' ? 'bg-blue-50' : 'bg-gray-50'
          }`}>
            <p>{msg.content}</p>
            {msg.sources && (
              <div className="mt-2 text-sm text-gray-600">
                <p className="font-semibold">Sources:</p>
                {msg.sources.map((s: any) => (
                  <p key={s.id}>[{s.id}] {s.content}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 p-2 border rounded"
          disabled={loading}
        />
        <button 
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {loading ? 'Asking...' : 'Ask'}
        </button>
      </form>
    </div>
  )
}