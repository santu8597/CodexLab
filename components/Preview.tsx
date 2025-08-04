"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, ExternalLink, AlertCircle } from "lucide-react"

interface PreviewProps {
  sandboxId: string | null
}

export function Preview({ sandboxId }: PreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMockSandbox, setIsMockSandbox] = useState(false)

  useEffect(() => {
    if (sandboxId) {
      // Check if it's a mock sandbox
      if (sandboxId.startsWith("mock-")) {
        setIsMockSandbox(true)
        setPreviewUrl(null)
      } else {
        setIsMockSandbox(false)
        // E2B sandboxes typically expose apps on port 3000
        setPreviewUrl(`https://${sandboxId}.e2b.dev:3000`)
      }
    } else {
      setPreviewUrl(null)
      setIsMockSandbox(false)
    }
  }, [sandboxId])

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

  if (isMockSandbox) {
    return (
      <div className="flex-1 border-l flex flex-col">
        <div className="border-b p-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Preview (Mock Mode)</div>
              <div className="text-xs text-muted-foreground mt-1">Mock sandbox - no live preview available</div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <Card className="p-6 text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <div className="font-medium mb-2">Mock Sandbox Mode</div>
            <div className="text-sm text-muted-foreground mb-4">
              The application is running in mock mode for development/testing. To see a live preview, configure your E2B
              API key.
            </div>
            <div className="text-xs text-muted-foreground">
              Files have been generated and can be viewed in the editor panel.
            </div>
          </Card>
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
