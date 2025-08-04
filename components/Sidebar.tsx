"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileNode {
  name: string
  path: string
  content?: string
  children?: FileNode[]
}

interface SidebarProps {
  files: FileNode[]
  currentFile: FileNode | null
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

export function Sidebar({ files, currentFile, onFileSelect }: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([""]))

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

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm">Project Files</h2>
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
                currentFile={currentFile}
                onFileSelect={onFileSelect}
                expandedFolders={expandedFolders}
                onToggleFolder={handleToggleFolder}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
