import { generateText, streamText } from "ai"
import { google } from "@ai-sdk/google"
import { Sandbox } from '@e2b/code-interpreter'
export interface ProjectContext {
  description: string
  files: string[]
  dependencies: string[]
  framework: string
}

export interface FileGenerationResult {
  path: string
  content: string
  isComplete: boolean
}

export class ProjectOrchestrator {
  private sandbox: Sandbox | null = null
  private context: ProjectContext
  private onUpdate: (data: any) => void
  private previewUrl: string | null = null

  constructor(description: string, onUpdate: (data: any) => void) {
    this.context = {
      description,
      files: [],
      dependencies: [],
      framework: "nextjs",
    }
    this.onUpdate = onUpdate
  }

  getPreviewUrl(): string | null {
    return this.previewUrl
  }

  async createSandbox(): Promise<string> {
    this.onUpdate({
      type: "log",
      message: "Creating E2B sandbox...",
    })

    if (!process.env.E2B_API_KEY) {
      throw new Error("E2B_API_KEY environment variable is not set")
    }

    this.sandbox = await Sandbox.create({
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: 900000,
    })

    const sandboxId = this.sandbox.sandboxId

    this.onUpdate({
      type: "sandbox_created",
      sandboxId: sandboxId,
    })

    this.onUpdate({
      type: "log",
      message: `E2B sandbox created: ${sandboxId}`,
    })

    return sandboxId
  }

  async generateProjectPlan(): Promise<string[]> {
    try {
      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new Error("GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set")
      }

      this.onUpdate({
        type: "log",
        message: "Generating project structure with AI...",
      })

      const { text } = await generateText({
        model: google("gemini-2.5-flash"),
        prompt: `You are an expert Next.js developer. Create a comprehensive file structure for a Next.js 14 project based on this description: "${this.context.description}"

Requirements:
- Use Next.js 14 with App Router
- Include TypeScript configuration
- Include Tailwind CSS setup
- Include shadcn/ui components as needed
- Create all necessary pages, components, and utilities
- Include proper package.json with all dependencies
- Break UI into reusable components and make sure to import them correctly
- Write the backend code in app/api folder
Return ONLY a JSON array of file paths in order of importance:
Example format: ["package.json", "next.config.js", "tailwind.config.js", "tsconfig.json", "app/layout.tsx", "app/page.tsx", "app/globals.css", "components/ui/button.tsx", "lib/utils.ts"]

Focus on creating a functional, complete project structure.`,
      })

      try {
        // Clean the response to extract just the JSON
        const cleanedText = text
          .trim()
          .replace(/```json\n?|\n?```/g, "")
          .trim()
        const files = JSON.parse(cleanedText)

        if (!Array.isArray(files)) {
          throw new Error("Response is not an array")
        }

        // Limit to 12 files and ensure they're strings
        this.context.files = files.filter((f) => typeof f === "string")

        this.onUpdate({
          type: "log",
          message: `AI generated project plan: ${this.context.files.length} files`,
        })

        return this.context.files
      } catch (parseError) {
        this.onUpdate({
          type: "log",
          message: `Failed to parse AI response, using smart fallback structure for: "${this.context.description}"`,
        })

        // Smart fallback based on project description
        const baseFiles = [
          "package.json",
          "next.config.js",
          "tailwind.config.js",
          "tsconfig.json",
          "app/layout.tsx",
          "app/page.tsx",
          "app/globals.css",
          "lib/utils.ts",
        ]
        
        // Add specific files based on project type
        const description = this.context.description.toLowerCase()
        if (description.includes("dashboard") || description.includes("admin")) {
          baseFiles.push("components/dashboard/sidebar.tsx", "components/dashboard/header.tsx")
        } else if (description.includes("blog")) {
          baseFiles.push("app/blog/page.tsx", "components/blog/post-card.tsx")
        } else if (description.includes("ecommerce") || description.includes("shop")) {
          baseFiles.push("app/products/page.tsx", "components/product/product-card.tsx")
        } else {
          baseFiles.push("components/ui/button.tsx", "components/hero.tsx")
        }

        this.context.files = baseFiles
        return baseFiles
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error generating plan"
      this.onUpdate({
        type: "log",
        message: `Project plan generation failed: ${message}`,
      })
      throw error
    }
  }

  async *generateFile(filePath: string): AsyncGenerator<FileGenerationResult> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized")
    }

    this.onUpdate({
      type: "file_start",
      path: filePath,
    })

    const contextInfo = `
Project: ${this.context.description}
Framework: Next.js 14 with App Router, TypeScript, Tailwind CSS
Current file: ${filePath}
Other files in project: ${this.context.files.filter((f) => f !== filePath).join(", ")}`

    let filePrompt = ""

    // Detailed prompts for each file type
    if (filePath === "package.json") {
      filePrompt = `Create a complete package.json for this Next.js project: "${this.context.description}"

Include:
- Next.js 14.x
- React 18.x
- TypeScript
- Tailwind CSS
- @radix-ui/react-* components for UI
- lucide-react for icons
- class-variance-authority and clsx for styling
- Any other dependencies needed for: ${this.context.description}
- always use next dev -H 0.0.0.0 -p 3000
Return only the JSON content, properly formatted.`
    } else if (filePath === "next.config.js") {
      filePrompt = `Create a next.config.js for: "${this.context.description}"
Include proper configuration for images, experimental features if needed.
Return only the JavaScript code.`
    } else if (filePath === "tailwind.config.js") {
      filePrompt = `Create a tailwind.config.js with shadcn/ui configuration for: "${this.context.description}"
Include proper content paths, theme extensions, and plugins.
Return only the JavaScript code.`
    } else if (filePath === "tsconfig.json") {
      filePrompt = `Create a tsconfig.json for Next.js 14 with App Router.
Include proper path mapping and modern TypeScript settings.
Return only the JSON content.`
    } else if (filePath.endsWith("layout.tsx")) {
      filePrompt = `Create the root layout.tsx for: "${this.context.description}"
${contextInfo}

Include:
- Proper HTML structure
- Font loading (Inter or similar)
- Metadata
- Global CSS import
- Clean, semantic structure

Return only the TypeScript React code.`
    } else if (filePath.endsWith("page.tsx")) {
      filePrompt = `Create ${filePath} for: "${this.context.description}"
${contextInfo}

Requirements:
- Use TypeScript and React
- Use Tailwind CSS for styling
- Create a functional, attractive page that matches the project description
- Include proper components and layout
- Make it production-ready and visually appealing

Return only the TypeScript React code.`
    } else if (filePath.includes("components/")) {
      filePrompt = `Create the component ${filePath} for: "${this.context.description}"
${contextInfo}

Requirements:
- Use TypeScript and React
- Use Tailwind CSS for styling
- Create a reusable, well-structured component
- Include proper props and types
- Make it functional and production-ready

Return only the TypeScript React code.`
    } else if (filePath === "app/globals.css") {
      filePrompt = `Create globals.css with Tailwind CSS and custom styles for: "${this.context.description}"
Include Tailwind directives and any custom CSS needed.
Return only the CSS code.`
    } else if (filePath === "lib/utils.ts") {
      filePrompt = `Create lib/utils.ts with utility functions for: "${this.context.description}"
Include cn function for class merging and other utilities as needed.
Return only the TypeScript code.`
    } else {
      filePrompt = `Create ${filePath} for the project: "${this.context.description}"
${contextInfo}

Requirements:
- Use appropriate technology for the file type
- Make it functional and production-ready
- Follow best practices
- Integrate well with the overall project

Return only the file content, no explanations.`
    }

    let fullContent = ""

    try {
      this.onUpdate({
        type: "log",
        message: `Generating ${filePath} with AI...`,
      })

      const result = await streamText({
        model: google("gemini-2.0-flash"),
        prompt: filePrompt,
      })

      for await (const delta of result.textStream) {
        fullContent += delta

        yield {
          path: filePath,
          content: fullContent,
          isComplete: false,
        }

        this.onUpdate({
          type: "file_content",
          path: filePath,
          content: fullContent,
          isComplete: false,
        })
      }

      // Clean up the content (remove markdown code blocks if present)
      fullContent = fullContent.replace(/```[\w]*\n?|\n?```/g, "").trim()

      // Write the complete file to sandbox
      await this.sandbox!.files.write(filePath, fullContent)

      this.onUpdate({
        type: "log",
        message: `✓ Generated ${filePath} (${fullContent.length} chars)`,
      })

      yield {
        path: filePath,
        content: fullContent,
        isComplete: true,
      }

      this.onUpdate({
        type: "file_content",
        path: filePath,
        content: fullContent,
        isComplete: true,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      this.onUpdate({
        type: "log",
        message: `Failed to generate ${filePath}: ${message}`,
      })
      throw error
    }
  }

  async runCommand(command: string): Promise<void> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized")
    }

    this.onUpdate({
      type: "log",
      message: `Running: ${command}`,
    })

    try {
      const result = await this.sandbox.commands.run(command,{ timeoutMs: 0 })

      if (result.stdout) {
        this.onUpdate({
          type: "log",
          message: result.stdout,
        })
      }

      if (result.stderr) {
        this.onUpdate({
          type: "log",
          message: `Error: ${result.stderr}`,
        })
      }

      if (result.exitCode !== 0) {
        throw new Error(`Command exited with code ${result.exitCode}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      this.onUpdate({
        type: "log",
        message: `Command failed: ${message}`,
      })
      throw error
    }
  }

  async buildProject(): Promise<void> {
    this.onUpdate({
      type: "status",
      status: "building",
      currentFile: "",
    })

    try {
      // Install dependencies
      await this.runCommand("npm install")

      // Start the dev server in background
      await this.runCommand("nohup npm run dev > /tmp/next.log 2>&1 &")

      // Get the preview URL
      if (this.sandbox) {
        const host = await this.sandbox.getHost(3000)
        this.previewUrl = `https://${host}`
        
        this.onUpdate({
          type: "preview_url",
          url: this.previewUrl,
        })

        this.onUpdate({
          type: "log",
          message: `✓ Preview URL: ${this.previewUrl}`,
        })
      }

      this.onUpdate({
        type: "log",
        message: "✓ Build completed successfully!",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      this.onUpdate({
        type: "log",
        message: `Build failed: ${message}`,
      })
      throw error
    }
  }

  async exportProject(): Promise<Buffer> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized")
    }

    try {
      // Create a zip file with the project files
      await this.runCommand("zip -r /tmp/project.zip .")
      
      // Read the zip file
      const zipContent = await this.sandbox.files.read("/tmp/project.zip")
      return Buffer.from(zipContent, 'binary')
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      throw new Error(`Export failed: ${message}`)
    }
  }

  async cleanup(): Promise<void> {
    if (this.sandbox) {
      try {
        await this.sandbox.kill()
        this.onUpdate({
          type: "log",
          message: "Sandbox cleaned up",
        })
      } catch (error) {
        this.onUpdate({
          type: "log",
          message: "Sandbox cleanup failed (not critical)",
        })
      }
      this.sandbox = null
    }
  }

  async *generateProject(): AsyncGenerator<any> {
    try {
      this.onUpdate({
        type: "log",
        message: "🚀 Starting AI project generation...",
      })

      // Create sandbox
      const sandboxId = await this.createSandbox()

      // Generate project plan
      const files = await this.generateProjectPlan()

      // Generate each file
      for (const filePath of files) {
        this.onUpdate({
          type: "status",
          status: "generating",
          currentFile: filePath,
        })

        for await (const result of this.generateFile(filePath)) {
          yield result
        }
      }

      // Build the project (includes starting dev server)
      await this.buildProject()

      this.onUpdate({
        type: "complete",
        sandboxId: this.sandbox!.sandboxId,
        previewUrl: this.previewUrl,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      this.onUpdate({
        type: "error",
        message,
      })
      throw error
    }
  }
}
