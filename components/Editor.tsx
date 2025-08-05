"use client"

import { useEffect, useState, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, PanelLeftClose, PanelLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import Prism from "prismjs"

// Import language definitions
import "prismjs/components/prism-typescript"
import "prismjs/components/prism-javascript"
import "prismjs/components/prism-jsx"
import "prismjs/components/prism-tsx"
import "prismjs/components/prism-css"
import "prismjs/components/prism-json"
import "prismjs/components/prism-markdown"

// Import custom vibrant theme
import "../styles/prism-vibrant.css"

interface FileNode {
  name: string
  path: string
  content?: string
  children?: FileNode[]
}

interface EditorProps {
  files: FileNode[]
  file: FileNode | null
  onFileSelect: (file: FileNode) => void
}

interface FileTreeItemProps {
  node: FileNode
  level: number
  currentFile: FileNode | null
  onFileSelect: (file: FileNode) => void
  expandedFolders: Set<string>
  onToggleFolder: (path: string) => void
}

function FileTreeItem({ node, level, currentFile, onFileSelect, expandedFolders, onToggleFolder }: FileTreeItemProps) {
  const isFolder = !!node.children
  const isExpanded = expandedFolders.has(node.path)
  const isSelected = currentFile?.path === node.path
  const hasContent = !!node.content

  const handleClick = () => {
    if (isFolder) {
      onToggleFolder(node.path)
    } else if (hasContent) {
      onFileSelect(node)
    }
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1 text-sm cursor-pointer hover:bg-accent rounded-sm",
          isSelected && "bg-accent",
          !hasContent && !isFolder && "opacity-50 cursor-default",
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {isFolder ? (
          <>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-blue-500" />
            ) : (
              <Folder className="w-4 h-4 text-blue-500" />
            )}
          </>
        ) : (
          <>
            <div className="w-4" />
            <File className="w-4 h-4 text-muted-foreground" />
          </>
        )}
        <span
          className={cn(
            "truncate",
            hasContent && "text-foreground",
            !hasContent && !isFolder && "text-muted-foreground",
          )}
        >
          {node.name}
        </span>
      </div>

      {isFolder && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={level + 1}
              currentFile={currentFile}
              onFileSelect={onFileSelect}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function Editor({ files, file, onFileSelect }: EditorProps) {
  const [displayContent, setDisplayContent] = useState("")
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([""]))
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

  const handleToggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

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
      <div className="flex h-full max-h-screen">
        {/* Sidebar */}
        {isSidebarVisible && (
          <div className="w-64 border-r bg-muted/30 flex flex-col">
            <div className="p-3 border-b flex items-center justify-between">
              <h2 className="font-semibold text-sm">Project Files</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarVisible(false)}
                className="h-6 w-6 p-0"
              >
                <PanelLeftClose className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {files.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">No files generated yet</div>
              ) : (
                <div className="space-y-1">
                  {files.map((file) => (
                    <FileTreeItem
                      key={file.path}
                      node={file}
                      level={0}
                      currentFile={file}
                      onFileSelect={onFileSelect}
                      expandedFolders={expandedFolders}
                      onToggleFolder={handleToggleFolder}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col h-full max-h-screen">
          <div className="border-b p-3 bg-muted/30 flex-shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isSidebarVisible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSidebarVisible(true)}
                  className="h-6 w-6 p-0 mr-2"
                >
                  <PanelLeft className="w-4 h-4" />
                </Button>
              )}
              <span className="font-medium text-sm">No file selected</span>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center bg-muted/20 min-h-0">
            <div className="text-center text-muted-foreground">
              <div className="text-lg font-medium mb-2">No file selected</div>
              <div className="text-sm">Select a file from the sidebar to view its content</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!file.content) {
    return (
      <div className="flex h-full max-h-screen">
        {/* Sidebar */}
        {isSidebarVisible && (
          <div className="w-64 border-r bg-muted/30 flex flex-col">
            <div className="p-3 border-b flex items-center justify-between">
              <h2 className="font-semibold text-sm">Project Files</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarVisible(false)}
                className="h-6 w-6 p-0"
              >
                <PanelLeftClose className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {files.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">No files generated yet</div>
              ) : (
                <div className="space-y-1">
                  {files.map((fileNode) => (
                    <FileTreeItem
                      key={fileNode.path}
                      node={fileNode}
                      level={0}
                      currentFile={file}
                      onFileSelect={onFileSelect}
                      expandedFolders={expandedFolders}
                      onToggleFolder={handleToggleFolder}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col h-full max-h-screen">
          <div className="border-b p-3 bg-muted/30 flex-shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isSidebarVisible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSidebarVisible(true)}
                  className="h-6 w-6 p-0 mr-2"
                >
                  <PanelLeft className="w-4 h-4" />
                </Button>
              )}
              <span className="font-medium text-sm">{file.name}</span>
              <Badge variant="secondary" className="text-xs">
                {getLanguageFromPath(file.path)}
              </Badge>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center bg-muted/20 min-h-0">
            <div className="text-center text-muted-foreground">
              <div className="text-lg font-medium mb-2">File not ready</div>
              <div className="text-sm">This file is being generated...</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full max-h-screen">
      {/* Sidebar */}
      {isSidebarVisible && (
        <div className="w-64 border-r bg-muted/30 flex flex-col">
          <div className="p-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm">Project Files</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarVisible(false)}
              className="h-6 w-6 p-0"
            >
              <PanelLeftClose className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {files.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No files generated yet</div>
            ) : (
              <div className="space-y-1">
                {files.map((fileNode) => (
                  <FileTreeItem
                    key={fileNode.path}
                    node={fileNode}
                    level={0}
                    currentFile={file}
                    onFileSelect={onFileSelect}
                    expandedFolders={expandedFolders}
                    onToggleFolder={handleToggleFolder}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col h-full max-h-screen">
        <div className="border-b p-3 bg-muted/30 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isSidebarVisible && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarVisible(true)}
                className="h-6 w-6 p-0 mr-2"
              >
                <PanelLeft className="w-4 h-4" />
              </Button>
            )}
            <span className="font-medium text-sm">{file.name}</span>
            <Badge variant="secondary" className="text-xs">
              {getLanguageFromPath(file.path)}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">{file.path}</div>
        </div>

        <div className="flex-1 overflow-auto bg-white min-h-0">
          <pre 
            className="p-4 text-sm leading-relaxed m-0 h-full w-full overflow-auto" 
            style={{ 
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              background: '#ffffff',
              color: '#2d3748',
              minHeight: '100%',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}
          >
            <code 
              ref={codeRef}
              className={`language-${getLanguageFromPath(file.path)}`}
              style={{ 
                background: 'transparent',
                display: 'block',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word'
              }}
            >
              {displayContent}
            </code>
          </pre>
        </div>
      </div>
    </div>
  )
}
