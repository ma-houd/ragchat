'use client'

import { Button } from '@/components/ui/button'
import { ArrowRight, BookOpen, FileText, Send, Sparkles, Upload, X } from 'lucide-react'
import { useCallback, useState } from 'react';

export default function Home() {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [documentId, setDocumentId] = useState<string>('')

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      setFile(droppedFile);
      handleUpload(droppedFile);
    }
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      handleUpload(selectedFile);
    }
  }, [])

  const handleUpload = async (file: File) =>  {
    const formData = new FormData()
    formData.append('file', file)

     const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
    
    const data = await res.json()
    setDocumentId(data.documentId)
    console.log(documentId)
  }
  
  if (file) {
    return <ChatInterface documentId={documentId} file={file} />
  }

  return (
    <div className="dark min-h-screen bg-background">
      {/* Subtle grid pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 backdrop-blur-sm">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                <FileText className="h-4 w-4 text-accent-foreground" />
              </div>
              <span className="text-lg font-semibold tracking-tight text-foreground">DocuChat</span>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="mx-auto max-w-5xl px-6 py-20">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/80 bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              AI-powered document analysis
            </div>
            <h1 className="mb-4 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Chat with your documents
            </h1>
            <p className="mx-auto max-w-xl text-lg text-muted-foreground">
              Upload any document and start asking questions. Get instant, accurate answers powered by advanced AI.
            </p>
          </div>

          {/* Upload Zone */}
          <div className="mx-auto max-w-2xl">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`group relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ${
                isDragging
                  ? "border-accent bg-accent/5 scale-[1.02]"
                  : file
                  ? "border-accent/50 bg-card"
                  : "border-border bg-card hover:border-muted-foreground/50 hover:bg-secondary/30"
              }`}
            >
              <input
                type="file"
                onChange={handleFileChange}
                className="absolute inset-0 cursor-pointer opacity-0"
                accept=".pdf,.doc,.docx,.txt,.md"
              />
              
              <div className="flex flex-col items-center justify-center px-8 py-16">
                <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 ${
                  isDragging ? "bg-accent scale-110" : file ? "bg-accent" : "bg-secondary"
                }`}>
                  {file ? (
                    <FileText className={`h-7 w-7 ${isDragging || file ? "text-accent-foreground" : "text-muted-foreground"}`} />
                  ) : (
                    <Upload className={`h-7 w-7 transition-transform group-hover:-translate-y-0.5 ${isDragging ? "text-accent-foreground" : "text-muted-foreground"}`} />
                  )}
                </div>
                
                {file ? (
                  <div className="text-center">
                    <p className="mb-2 text-lg font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="mb-2 text-lg font-medium text-foreground">
                      {isDragging ? "Drop your file here" : "Drag and drop your document"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse • PDF, DOC, DOCX, TXT, MD
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function ChatInterface({ documentId, file }: { documentId: string, file: File }) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setQuestion('')

    const userMessage = { role: 'user', content: question }
    setMessages(prev => [...prev, userMessage])
    
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, documentId })
    })

    const sourcesHeader = res.headers.get('X-Sources') || ''
    const sources = sourcesHeader 
      ? JSON.parse(decodeURIComponent(escape(atob(sourcesHeader))))
      : []
    
    const reader = res.body!.getReader()
    const decoder = new TextDecoder('utf-8', { fatal: false })
    let answer = ''

    setMessages(prev => [...prev, { role: 'assistant', content: '', sources: [] }])


    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      answer += decoder.decode(value)
      // Update le dernier message en temps réel
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: answer, sources: [] }
      ])
    }

    const citedIds = [...answer.matchAll(/\[(\d+)\]/g)].map(m => parseInt(m[1]))
    const filteredSources = sources.filter((s: any) => citedIds.includes(s.id))
    setMessages(prev => [
      ...prev.slice(0, -1),
      { role: 'assistant', content: answer, sources: filteredSources }
    ])
    

    setIsLoading(false)
  }
  
  return (
      <div className="dark flex h-screen flex-col bg-background">
        {/* Subtle grid pattern */}
        <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

        <div className="relative z-10 flex h-full flex-col">
          {/* Header */}
          <header className="shrink-0 border-b border-border/50 backdrop-blur-sm">
            <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                  <FileText className="h-4 w-4 text-accent-foreground" />
                </div>
                <span className="text-lg font-semibold tracking-tight text-foreground">DocuChat</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-border/80 bg-secondary/50 px-3 py-1.5">
                  <FileText className="h-3.5 w-3.5 text-accent" />
                  <span className="max-w-[200px] truncate text-sm text-muted-foreground">{file?.name}</span>
                </div>
              </div>
            </div>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-4xl px-6 py-8">
              <div className="space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] ${
                        message.role === "user"
                          ? "rounded-2xl rounded-br-md bg-accent px-4 py-3 text-accent-foreground"
                          : "space-y-3"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                            <Sparkles className="h-4 w-4 text-accent" />
                          </div>
                          <div className="space-y-3">
                            <p className="leading-relaxed text-foreground">{message.content}</p>
                            {message.sources && message.sources.length > 0 && (
                              <div className="space-y-2">
                                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                  <BookOpen className="h-3 w-3" />
                                  Sources
                                </p>
                                <div className="space-y-2">
                                  {message.sources.map((source, idx) => (
                                    <div
                                      key={idx}
                                      className="rounded-lg border border-border/50 bg-card/50 p-3 transition-colors hover:bg-card"
                                    >
                                      <div className="mb-1 flex items-center gap-2">
                                        <span className="rounded bg-accent/20 px-1.5 py-0.5 text-xs font-medium text-accent">
                                          {source.id}
                                        </span>
                                      </div>
                                      <p className="text-sm leading-relaxed text-muted-foreground">{source.content}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {message.role === "user" && <p>{message.content}</p>}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                        <Sparkles className="h-4 w-4 text-accent" />
                      </div>
                      <div className="flex items-center gap-1.5 py-2">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/50" />
                        <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                        <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-border/50 backdrop-blur-sm">
            <div className="mx-auto max-w-4xl px-6 py-4">
              <div className="flex items-end gap-3">
                <div className="relative flex flex-1">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask a question about your document..."
                    className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 pr-12 text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    style={{ minHeight: "48px", maxHeight: "120px" }}
                  />
                </div>
                <Button
                  onClick={handleAsk}
                  disabled={!question.trim() || isLoading}
                  size="icon"
                  className="h-12 w-12 shrink-0 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                AI responses are based on your document content
              </p>
            </div>
          </div>
        </div>
      </div>
    )
}