"use client"

import { useEffect, useState, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import Prism from "prismjs"

// Import language definitions
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-jsx"
import "prismjs/components/prism-tsx"
import "prismjs/components/prism-css"
import "prismjs/components/prism-json"
import "prismjs/components/prism-markdown"

// Import theme
import "prismjs/themes/prism-tomorrow.css"

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
  const codeRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (file?.content) {
      setDisplayContent(file.content)
    } else {
      setDisplayContent("")
    }
  }, [file])

  useEffect(() => {
    if (codeRef.current && displayContent) {
      Prism.highlightElement(codeRef.current)
    }
  }, [displayContent, file?.path])

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split(".").pop()?.toLowerCase()
    switch (ext) {
      case "tsx":
        return "tsx"
      case "ts":
        return "typescript"
      case "jsx":
        return "jsx"
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

      <div className="flex-1 overflow-auto bg-[#2d3748]">
        <pre className="p-4 text-sm leading-relaxed m-0 min-h-full" style={{ 
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          background: '#2d3748',
          color: '#e2e8f0'
        }}>
          <code 
            ref={codeRef}
            className={`language-${getLanguageFromPath(file.path)}`}
            style={{ background: 'transparent' }}
          >
            {displayContent}
          </code>
        </pre>
      </div>
    </div>
  )
}
