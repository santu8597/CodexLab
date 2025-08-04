import type { NextRequest } from "next/server"
import { ProjectOrchestrator } from "@/lib/orchestrator"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  let orchestrator: ProjectOrchestrator | null = null

  try {
    const body = await request.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== "string") {
      return new Response("Valid prompt is required", { status: 400 })
    }

    // Check for Google AI API key (required)
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(
        "GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set. Please configure your Google AI API key.",
        { status: 500 },
      )
    }

    // E2B is optional - will use mock sandbox if not available
    const hasE2B = !!process.env.E2B_API_KEY
    console.log(`E2B API Key available: ${hasE2B}`)

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        orchestrator = new ProjectOrchestrator(prompt, (data) => {
          try {
            const chunk = `data: ${JSON.stringify(data)}\n\n`
            controller.enqueue(encoder.encode(chunk))
          } catch (error) {
            console.error("Failed to send update:", error)
          }
        })

        try {
          for await (const result of orchestrator.generateProject()) {
            // Results are already sent via the onUpdate callback
          }
        } catch (error) {
          console.error("Generation error:", error)
          const errorData = {
            type: "error",
            message: error instanceof Error ? error.message : "Generation failed",
          }
          try {
            const chunk = `data: ${JSON.stringify(errorData)}\n\n`
            controller.enqueue(encoder.encode(chunk))
          } catch (streamError) {
            console.error("Failed to send error:", streamError)
          }
        } finally {
          if (orchestrator) {
            try {
              await orchestrator.cleanup()
            } catch (cleanupError) {
              console.error("Cleanup error:", cleanupError)
            }
          }
          controller.close()
        }
      },

      cancel() {
        // Handle client disconnect
        if (orchestrator) {
          orchestrator.cleanup().catch(console.error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    })
  } catch (error) {
    console.error("API route error:", error)

    // Cleanup orchestrator if it was created
    if (orchestrator) {
      try {
        await orchestrator.cleanup()
      } catch (cleanupError) {
        console.error("Cleanup error during error handling:", cleanupError)
      }
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sandboxId = searchParams.get("sandboxId")

    if (!sandboxId) {
      return new Response("Sandbox ID is required", { status: 400 })
    }

    // For now, return a simple message
    return new Response("Export functionality is in development", { status: 501 })
  } catch (error) {
    console.error("Export error:", error)
    return new Response("Export failed", { status: 500 })
  }
}
