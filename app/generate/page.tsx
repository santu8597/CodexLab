"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Sidebar } from "@/components/Sidebar"
import { Editor } from "@/components/Editor"
import { Preview } from "@/components/Preview"
import { Button } from "@/components/ui/button"
import { Loader2, Download, ArrowLeft, RefreshCw } from "lucide-react"

interface FileNode {
  name: string
  path: string
  content?: string
  children?: FileNode[]
}

interface GenerationStatus {
  currentFile: string
  status: "idle" | "generating" | "building" | "complete" | "error"
  logs: string[]
}

function GenerateContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const prompt = searchParams?.get("prompt") || ""
  
  const [files, setFiles] = useState<FileNode[]>([])
  const [currentFile, setCurrentFile] = useState<FileNode | null>(null)
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({
    currentFile: "",
    status: "idle",
    logs: [],
  })
  const [sandboxId, setSandboxId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Auto-start generation when the page loads
  useEffect(() => {
    if (prompt && generationStatus.status === "idle") {
      handleGenerate()
    }
  }, [prompt])

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    // Abort any existing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    setFiles([])
    setCurrentFile(null)
    setGenerationStatus({
      currentFile: "",
      status: "generating",
      logs: ["Starting generation..."],
    })

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        const lines = chunk.split("\n").filter((line) => line.trim())

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === "sandbox_created") {
                setSandboxId(data.sandboxId)
              } else if (data.type === "preview_url") {
                setPreviewUrl(data.url)
              } else if (data.type === "file_start") {
                setGenerationStatus((prev) => ({
                  ...prev,
                  currentFile: data.path,
                }))
              } else if (data.type === "file_content") {
                updateFileContent(data.path, data.content, data.isComplete)
              } else if (data.type === "status") {
                setGenerationStatus((prev) => ({
                  ...prev,
                  status: data.status,
                  currentFile: data.currentFile || prev.currentFile,
                }))
              } else if (data.type === "log") {
                setGenerationStatus((prev) => ({
                  ...prev,
                  logs: [...prev.logs, data.message],
                }))
              } else if (data.type === "complete") {
                setPreviewUrl(data.previewUrl || previewUrl)
                setGenerationStatus((prev) => ({
                  ...prev,
                  status: "complete",
                  currentFile: "",
                }))
              } else if (data.type === "error") {
                setGenerationStatus((prev) => ({
                  ...prev,
                  status: "error",
                  logs: [...prev.logs, `Error: ${data.message}`],
                }))
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e, "Line:", line)
              setGenerationStatus((prev) => ({
                ...prev,
                logs: [...prev.logs, `Parse error: ${line}`],
              }))
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Generation error:", error)
        setGenerationStatus((prev) => ({
          ...prev,
          status: "error",
          logs: [...prev.logs, `Error: ${error.message}`],
        }))
      }
    }
  }

  const updateFileContent = (path: string, content: string, isComplete: boolean) => {
    setFiles((prev) => {
      const updated = [...prev]
      const pathParts = path.split("/")
      let current = updated
      let node: FileNode | undefined

      // Navigate to the correct location in the tree
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i]
        if (!part) continue

        node = current.find((n) => n.name === part)

        if (!node) {
          node = {
            name: part,
            path: pathParts.slice(0, i + 1).join("/"),
            children: i < pathParts.length - 1 ? [] : undefined,
            content: i === pathParts.length - 1 ? content : undefined,
          }
          current.push(node)
        } else if (i === pathParts.length - 1) {
          node.content = content
        }

        if (node.children) {
          current = node.children
        }
      }

      return updated
    })

    // Update current file if it's the one being edited
    if (currentFile?.path === path) {
      setCurrentFile((prev) => (prev ? { ...prev, content } : null))
    }
  }

  const handleExport = async () => {
    if (!sandboxId) return

    try {
      const response = await fetch(`/api/export?sandboxId=${sandboxId}`)
      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "project.zip"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export failed:", error)
    }
  }

  const handleRegenerate = () => {
    handleGenerate()
  }

  const isGenerating = generationStatus.status === "generating" || generationStatus.status === "building"

  return (
    <div className="flex h-screen bg-background">
      {/* Left Panel - Chat Interface */}
      <div className="w-80 border-r bg-muted/30 flex flex-col">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="font-semibold">Chat</h1>
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-1 p-4 overflow-auto">
          {/* Project Description */}
          <div className="mb-6">
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 mb-4">
              <div className="text-sm font-medium mb-2">Project Request:</div>
              <div className="text-sm text-muted-foreground">{prompt}</div>
            </div>
          </div>

          {/* Status Updates */}
          {generationStatus.status !== "idle" && (
            <div className="space-y-3">
              <div className="bg-background rounded-lg p-3 border">
                <div className="flex items-center gap-2 text-sm mb-2">
                  {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span className="font-medium">
                    {generationStatus.status === "generating" && "Generating Project"}
                    {generationStatus.status === "building" && "Building Project"}
                    {generationStatus.status === "complete" && "Project Complete"}
                    {generationStatus.status === "error" && "Generation Failed"}
                  </span>
                </div>
                
                {generationStatus.currentFile && (
                  <div className="text-xs text-muted-foreground mb-2">
                    Current: {generationStatus.currentFile}
                  </div>
                )}

                {generationStatus.logs.length > 0 && (
                  <div className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                    {generationStatus.logs.slice(-10).map((log, i) => (
                      <div key={i} className="font-mono">{log}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Button 
              onClick={handleRegenerate} 
              disabled={isGenerating} 
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
            {sandboxId && generationStatus.status === "complete" && (
              <Button onClick={handleExport} size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Middle Panel - File Tree */}
      <div className="w-64 border-r">
        <Sidebar files={files} currentFile={currentFile} onFileSelect={setCurrentFile} />
      </div>

      {/* Right Panel - Code Editor and Preview */}
      <div className="flex-1 flex">
        <Editor file={currentFile} />
        {generationStatus.status === "complete" && (
          <Preview sandboxId={sandboxId} previewUrl={previewUrl} />
        )}
        {generationStatus.status !== "complete" && (
          <div className="flex-1 border-l flex items-center justify-center bg-muted/20">
            <div className="text-center text-muted-foreground">
              <div className="text-lg font-medium mb-2">Preview</div>
              <div className="text-sm">
                {generationStatus.status === "idle" && "Generate a project to see the preview"}
                {generationStatus.status === "generating" && "Generating project files..."}
                {generationStatus.status === "building" && "Building project..."}
                {generationStatus.status === "error" && "Generation failed"}
              </div>
              {isGenerating && (
                <div className="flex items-center justify-center mt-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function GeneratePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading generator...</p>
        </div>
      </div>
    }>
      <GenerateContent />
    </Suspense>
  )
}
