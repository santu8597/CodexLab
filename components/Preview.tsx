"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, ExternalLink, AlertCircle } from "lucide-react"

interface PreviewProps {
  sandboxId: string | null
  previewUrl?: string | null
}

export function Preview({ sandboxId, previewUrl: externalPreviewUrl }: PreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (externalPreviewUrl) {
      // Use the provided preview URL from E2B
      setPreviewUrl(externalPreviewUrl)
    } else if (sandboxId && !sandboxId.startsWith("memfs-") && !sandboxId.startsWith("mock-")) {
      // Fallback for E2B sandboxes without explicit URL
      setPreviewUrl(`https://${sandboxId}.e2b.dev:3000`)
    } else {
      setPreviewUrl(null)
    }
  }, [sandboxId, externalPreviewUrl])

  const handleRefresh = () => {
    if (previewUrl) {
      setIsLoading(true)
      setError(null)
      // Force iframe reload
      const iframe = document.getElementById("preview-iframe") as HTMLIFrameElement
      if (iframe) {
        iframe.src = iframe.src
      }
      setTimeout(() => setIsLoading(false), 1000)
    }
  }

  const handleOpenExternal = () => {
    if (previewUrl) {
      window.open(previewUrl, "_blank")
    }
  }

  const handleIframeLoad = () => {
    setIsLoading(false)
    setError(null)
  }

  const handleIframeError = () => {
    setIsLoading(false)
    setError("Failed to load preview")
  }

  if (!sandboxId) {
    return (
      <div className="flex-1 border-l flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <div className="text-lg font-medium mb-2">No preview available</div>
          <div className="text-sm">Generate a project to see the live preview</div>
        </div>
      </div>
    )
  }

  if (!previewUrl) {
    return (
      <div className="flex-1 border-l flex items-center justify-center bg-muted/20">
        <div className="text-center text-muted-foreground">
          <div className="text-lg font-medium mb-2">Preview Loading</div>
          <div className="text-sm">Waiting for preview URL...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 border-l flex flex-col">
      <div className="border-b p-3 bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">Live Preview</div>
            <div className="text-xs text-muted-foreground mt-1">{previewUrl}</div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" variant="outline" onClick={handleOpenExternal}>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        {error ? (
          <div className="flex items-center justify-center h-full">
            <Card className="p-6 text-center">
              <div className="text-destructive font-medium mb-2">Preview Error</div>
              <div className="text-sm text-muted-foreground mb-4">{error}</div>
              <Button onClick={handleRefresh} size="sm">
                Try Again
              </Button>
            </Card>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                <div className="flex items-center gap-2 text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading preview...
                </div>
              </div>
            )}
            {previewUrl && (
              <iframe
                id="preview-iframe"
                src={previewUrl}
                className="w-full h-full border-0"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              />
            )}
            {!previewUrl && (
              <div className="flex items-center justify-center h-full">
                <Card className="p-6 text-center">
                  <div className="text-muted-foreground font-medium mb-2">No Preview URL</div>
                  <div className="text-sm text-muted-foreground">Waiting for sandbox to be ready...</div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
