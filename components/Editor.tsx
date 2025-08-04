"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"

interface FileNode {
  name: string
  path: string
  content?: string
  children?: FileNode[]
}

interface EditorProps {
  file: FileNode | null
}

export function Editor({ file }: EditorProps) {
  const [displayContent, setDisplayContent] = useState("")

  useEffect(() => {
    if (file?.content) {
      setDisplayContent(file.content)
    } else {
      setDisplayContent("")
    }
  }, [file])

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split(".").pop()?.toLowerCase()
    switch (ext) {
      case "tsx":
      case "ts":
        return "typescript"
      case "jsx":
      case "js":
        return "javascript"
      case "css":
        return "css"
      case "json":
        return "json"
      case "md":
        return "markdown"
      case "html":
        return "html"
      default:
        return "text"
    }
  }

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <div className="text-lg font-medium mb-2">No file selected</div>
          <div className="text-sm">Select a file from the sidebar to view its content</div>
        </div>
      </div>
    )
  }

  if (!file.content) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <div className="text-lg font-medium mb-2">File not ready</div>
          <div className="text-sm">This file is being generated...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b p-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{file.name}</span>
          <Badge variant="secondary" className="text-xs">
            {getLanguageFromPath(file.path)}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-1">{file.path}</div>
      </div>

      <div className="flex-1 overflow-auto">
        <pre className="p-4 text-sm font-mono leading-relaxed">
          <code className="language-typescript">{displayContent}</code>
        </pre>
      </div>
    </div>
  )
}
