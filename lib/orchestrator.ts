import { generateText, streamText } from "ai"
import { google } from "@ai-sdk/google"
import { Sandbox } from '@e2b/code-interpreter'
import { packageJson, tsconfigJson, tailwindConfig, postcssConfig, nextConfig, utilsTs } from '../basic-files/package'
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
  private memfs: Map<string, string> = new Map() // In-memory file system

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

  async waitForServer(port: number, maxRetries: number = 10): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        if (this.sandbox) {
          const host = await this.sandbox.getHost(port)
          this.onUpdate({
            type: "log",
            message: `✓ Server is ready at https://${host}`,
          })
          return true
        }
      } catch (error) {
        this.onUpdate({
          type: "log",
          message: `Waiting for server on port ${port}... (${i + 1}/${maxRetries})`,
        })
        
        // Check if there are any processes running
        if (this.sandbox) {
          try {
            const result = await this.sandbox.commands.run("ps aux | grep node", { timeoutMs: 5000 })
            this.onUpdate({
              type: "log",
              message: `Process check: ${result.stdout}`,
            })
          } catch (e) {
            // Ignore process check errors
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    }
    return false
  }

  async createSandbox(): Promise<string> {
    this.onUpdate({
      type: "log",
      message: "Creating E2B sandbox...",
    })

    if (!process.env.E2B_API_KEY) {
      throw new Error("E2B_API_KEY environment variable is not set")
    }

    try {
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
        message: `✓ E2B sandbox created successfully: ${sandboxId}`,
      })

      // Copy predefined config files to sandbox
      await this.copyConfigFiles()

      // Copy shadcn/ui components to sandbox
      await this.copyShadcnComponents()

      // Install dependencies
      await this.installDependencies()

      return sandboxId
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      this.onUpdate({
        type: "log",
        message: `❌ Failed to create E2B sandbox: ${message}`,
      })
      throw new Error(`Failed to create E2B sandbox: ${message}`)
    }
  }

  async createSandboxAsync(): Promise<string> {
    this.onUpdate({
      type: "log",
      message: "Creating E2B sandbox (async)...",
    })

    if (!process.env.E2B_API_KEY) {
      throw new Error("E2B_API_KEY environment variable is not set")
    }

    try {
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
        message: `✓ E2B sandbox created successfully: ${sandboxId}`,
      })

      // Copy predefined config files to sandbox
      await this.copyConfigFiles()

      // Copy shadcn/ui components to sandbox
      await this.copyShadcnComponents()

      // Install dependencies
      await this.installDependencies()

      return sandboxId
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      this.onUpdate({
        type: "log",
        message: `❌ Failed to create E2B sandbox: ${message}`,
      })
      throw new Error(`Failed to create E2B sandbox: ${message}`)
    }
  }

  async copyShadcnComponents(): Promise<void> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized")
    }

    this.onUpdate({
      type: "log",
      message: "Copying shadcn/ui components to sandbox...",
    })

    try {
      // Create the components/ui directory
      await this.sandbox.files.makeDir("components/ui")

      // List of all shadcn/ui components to copy
      const uiComponents = [
        "accordion.tsx", "alert-dialog.tsx", "alert.tsx", "aspect-ratio.tsx", "avatar.tsx",
        "badge.tsx", "breadcrumb.tsx", "button.tsx", "calendar.tsx", "card.tsx",
        "carousel.tsx", "chart.tsx", "checkbox.tsx", "collapsible.tsx", "command.tsx",
        "context-menu.tsx", "dialog.tsx", "drawer.tsx", "dropdown-menu.tsx", "form.tsx",
        "hover-card.tsx", "input-otp.tsx", "input.tsx", "label.tsx", "menubar.tsx",
        "navigation-menu.tsx", "pagination.tsx", "popover.tsx", "progress.tsx", "radio-group.tsx",
        "resizable.tsx", "scroll-area.tsx", "select.tsx", "separator.tsx", "sheet.tsx",
        "sidebar.tsx", "skeleton.tsx", "slider.tsx", "sonner.tsx", "switch.tsx",
        "table.tsx", "tabs.tsx", "textarea.tsx", "toast.tsx", "toaster.tsx",
        "toggle-group.tsx", "toggle.tsx", "tooltip.tsx", "use-mobile.tsx", "use-toast.ts"
      ]

      // Copy each component file
      for (const componentFile of uiComponents) {
        try {
          // Read the local component file
          const fs = require('fs')
          const path = require('path')
          const localPath = path.join(process.cwd(), 'components', 'ui', componentFile)
          
          if (fs.existsSync(localPath)) {
            const componentContent = fs.readFileSync(localPath, 'utf8')
            
            // Write to sandbox
            await this.sandbox.files.write(`components/ui/${componentFile}`, componentContent)
            
            this.onUpdate({
              type: "log",
              message: `✓ Copied ${componentFile} to sandbox`,
            })
          }
        } catch (error) {
          this.onUpdate({
            type: "log",
            message: `⚠️ Failed to copy ${componentFile}: ${error}`,
          })
        }
      }

      this.onUpdate({
        type: "log",
        message: "✓ All shadcn/ui components copied to sandbox",
      })

    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      this.onUpdate({
        type: "log",
        message: `❌ Failed to copy shadcn/ui components: ${message}`,
      })
      throw new Error(`Failed to copy shadcn/ui components: ${message}`)
    }
  }

  async copyConfigFiles(): Promise<void> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized")
    }

    this.onUpdate({
      type: "log",
      message: "Copying configuration files to sandbox...",
    })

    try {
      // Copy predefined config files
      const configFiles = [
        { path: "package.json", content: packageJson },
        { path: "tsconfig.json", content: tsconfigJson },
        { path: "tailwind.config.js", content: tailwindConfig },
        { path: "postcss.config.mjs", content: postcssConfig },
        { path: "next.config.js", content: nextConfig },
        { path: "lib/utils.ts", content: utilsTs }
      ]

      for (const file of configFiles) {
        await this.sandbox.files.write(file.path, file.content)
        this.onUpdate({
          type: "log",
          message: `✓ Copied ${file.path} to sandbox`,
        })
      }

      this.onUpdate({
        type: "log",
        message: "✓ All configuration files copied to sandbox",
      })

    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      this.onUpdate({
        type: "log",
        message: `❌ Failed to copy config files: ${message}`,
      })
      throw new Error(`Failed to copy config files: ${message}`)
    }
  }

  async installDependencies(): Promise<void> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized")
    }

    this.onUpdate({
      type: "log",
      message: "Installing dependencies in sandbox...",
    })

    try {
      await this.runCommand("npm install")
      this.onUpdate({
        type: "log",
        message: "✓ Dependencies installed successfully",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      this.onUpdate({
        type: "log",
        message: `❌ Failed to install dependencies: ${message}`,
      })
      throw new Error(`Failed to install dependencies: ${message}`)
    }
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
- All shadcn/ui components are ALREADY AVAILABLE in components/ui/ - DO NOT include them in the file list
- The following files are ALREADY PROVIDED and should NOT be generated:
  * package.json
  * tsconfig.json  
  * tailwind.config.js
  * postcss.config.mjs
  * next.config.js
  * lib/utils.ts
- Create all necessary pages, components, and utilities
- Break UI into reusable components and make sure to import them correctly
- Write the backend code in app/api folder
- Focus on custom components, pages, and business logic only

IMPORTANT: Do NOT include any files from components/ui/ or config files mentioned above as they are already provided.

Return ONLY a JSON array of file paths in order of importance:
Example format: ["app/layout.tsx", "app/page.tsx", "app/globals.css", "components/hero.tsx"]

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

        // Smart fallback based on project description (excluding already provided config files)
        const baseFiles = [
          "app/layout.tsx",
          "app/page.tsx",
          "app/globals.css",
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
          baseFiles.push("components/hero.tsx", "components/navbar.tsx")
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
    // Skip generating shadcn/ui components as they are already copied
    if (filePath.startsWith("components/ui/")) {
      this.onUpdate({
        type: "log",
        message: `✓ Skipping ${filePath} - shadcn/ui component already available`,
      })
      return
    }

    // Skip generating config files as they are already provided
    const configFiles = ["package.json", "tsconfig.json", "tailwind.config.js", "postcss.config.mjs", "next.config.js", "lib/utils.ts"]
    if (configFiles.includes(filePath)) {
      this.onUpdate({
        type: "log",
        message: `✓ Skipping ${filePath} - config file already provided`,
      })
      return
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

    // Use predefined content for configuration files
    if (filePath === "package.json") {
      const fullContent = packageJson

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

      return
    } else if (filePath === "tsconfig.json") {
      const fullContent = tsconfigJson

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

      return
    } else if (filePath === "tailwind.config.js") {
      const fullContent = tailwindConfig

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

      return
    } else if (filePath === "postcss.config.mjs") {
      const fullContent = postcssConfig

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

      return
    } else if (filePath === "next.config.js") {
      const fullContent = nextConfig

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

      return
    } else if (filePath === "lib/utils.ts") {
      const fullContent = utilsTs

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

      return
    }

    // Generate AI prompts for other files
    if (filePath.endsWith("layout.tsx")) {
      filePrompt = `Create the root layout.tsx for: "${this.context.description}"
${contextInfo}

Include:
- Proper HTML structure
- Font loading (Inter or similar)
- Metadata
- Global CSS import
- Clean, semantic structure

Note: All shadcn/ui components are already available in components/ui/ and can be imported directly.

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
- make sure to use default imports
Important: Use default imports for all components coming from @/components/***

Note: All shadcn/ui components (Button, Card, Input, etc.) are already available in components/ui/ and can be imported directly.
Example: import { Button } from "@/components/ui/button"

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

- Note:(very important) Always use default imports for custom made components coming from @/components/***


Note: All shadcn/ui components (Button, Card, Input, Dialog, etc.) are already available in components/ui/ and can be imported directly.
Example: import { Button } from "@/components/ui/button"

Return only the TypeScript React code.`
    } else if (filePath === "app/globals.css") {
      filePrompt = `Create globals.css with Tailwind CSS and custom styles for: "${this.context.description}"
Include Tailwind directives and any custom CSS needed.
Return only the CSS code.`
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
        model: google("gemini-2.5-pro"),
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

      // Store the complete file in memfs (in-memory file system)
      this.memfs.set(filePath, fullContent)

      this.onUpdate({
        type: "log",
        message: `✓ Generated ${filePath} (${fullContent.length} chars) - stored in memory`,
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

  async *generateFileToMemfs(filePath: string): AsyncGenerator<FileGenerationResult> {
    // Skip generating shadcn/ui components as they are already copied
    if (filePath.startsWith("components/ui/")) {
      this.onUpdate({
        type: "log",
        message: `✓ Skipping ${filePath} - shadcn/ui component already available`,
      })
      return
    }

    // Skip generating config files as they are already provided
    const configFiles = ["package.json", "tsconfig.json", "tailwind.config.js", "postcss.config.mjs", "next.config.js", "lib/utils.ts"]
    if (configFiles.includes(filePath)) {
      this.onUpdate({
        type: "log",
        message: `✓ Skipping ${filePath} - config file already provided`,
      })
      return
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

    // Generate AI prompts for files
    if (filePath.endsWith("layout.tsx")) {
      filePrompt = `Create the root layout.tsx for: "${this.context.description}"
${contextInfo}

Include:
- Proper HTML structure
- Font loading (Inter or similar)
- Metadata
- Global CSS import
- Clean, semantic structure

Note: All shadcn/ui components are already available in components/ui/ and can be imported directly.
- Note:(very important) Always use default imports for custom made components coming from @/components/***

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
- make sure to use default imports
- use "use client"
Important: Use default imports for all components coming from @/components/***

Note: All shadcn/ui components (Button, Card, Input, etc.) are already available in components/ui/ and can be imported directly.
Example: import { Button } from "@/components/ui/button"

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
- use "use client"
- Note:(very important) Always use default imports for custom made components coming from @/components/***


Note: All shadcn/ui components (Button, Card, Input, Dialog, etc.) are already available in components/ui/ and can be imported directly.
Example: import { Button } from "@/components/ui/button"

Return only the TypeScript React code.`
    } else if (filePath === "app/globals.css") {
      filePrompt = `Create globals.css with Tailwind CSS and custom styles for: "${this.context.description}"
Include Tailwind directives and any custom CSS needed.
Return only the CSS code.`
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
        model: google("gemini-2.5-flash"),
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

      // Store the complete file in memfs (in-memory file system)
      this.memfs.set(filePath, fullContent)

      this.onUpdate({
        type: "log",
        message: `✓ Generated ${filePath} (${fullContent.length} chars) - stored in memory`,
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

  async transferFilesToSandbox(): Promise<void> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized")
    }

    this.onUpdate({
      type: "log",
      message: "Transferring generated files from memory to sandbox...",
    })

    try {
      let transferredCount = 0
      const filePaths = Array.from(this.memfs.keys())
      
      for (const filePath of filePaths) {
        const content = this.memfs.get(filePath)
        if (content) {
          await this.sandbox.files.write(filePath, content)
          transferredCount++
          this.onUpdate({
            type: "log",
            message: `✓ Transferred ${filePath} to sandbox`,
          })
        }
      }

      this.onUpdate({
        type: "log",
        message: `✓ Successfully transferred ${transferredCount} files to sandbox`,
      })

    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      this.onUpdate({
        type: "log",
        message: `❌ Failed to transfer files to sandbox: ${message}`,
      })
      throw new Error(`Failed to transfer files to sandbox: ${message}`)
    }
  }

  async buildProject(): Promise<void> {
    this.onUpdate({
      type: "status",
      status: "building",
      currentFile: "",
    })

    try {
      // Transfer files from memfs to sandbox
      await this.transferFilesToSandbox()

      // Start the dev server in background
      this.onUpdate({
        type: "log",
        message: "Starting development server...",
      })
      
      // Check if package.json exists and has the right dev script
      try {
        const packageJson = await this.sandbox!.files.read("package.json")
        this.onUpdate({
          type: "log",
          message: "Package.json found - checking dev script...",
        })
        
        const pkg = JSON.parse(packageJson)
        if (pkg.scripts && pkg.scripts.dev) {
          this.onUpdate({
            type: "log",
            message: `Dev script: ${pkg.scripts.dev}`,
          })
        }
      } catch (error) {
        this.onUpdate({
          type: "log",
          message: `Could not read package.json: ${error}`,
        })
      }
      
      // Start dev server in background using screen or nohup
      this.sandbox!.commands.run("nohup npm run dev > /tmp/next.log 2>&1 &", { timeoutMs: 0 }).catch((error) => {
        this.onUpdate({
          type: "log",
          message: `Dev server command completed: ${error}`,
        })
      })

      // Wait for the server to be ready
      this.onUpdate({
        type: "log",
        message: "Waiting for development server to start...",
      })
      
      const serverReady = await this.waitForServer(3000, 15)
      
      if (serverReady && this.sandbox) {
        try {
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
        } catch (error) {
          this.onUpdate({
            type: "log",
            message: `Could not get preview URL: ${error}`,
          })
        }
      } else {
        this.onUpdate({
          type: "log",
          message: "⚠️ Development server did not start in time - checking logs...",
        })
        
        // Try to read the dev server logs
        try {
          const logs = await this.sandbox!.files.read("/tmp/next.log")
          this.onUpdate({
            type: "log",
            message: `Dev server logs: ${logs}`,
          })
        } catch (error) {
          this.onUpdate({
            type: "log",
            message: `Could not read dev server logs: ${error}`,
          })
        }
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

  async *generateProject(): AsyncGenerator<any> {
    try {
      this.onUpdate({
        type: "log",
        message: "🚀 Starting AI project generation with parallel processing...",
      })

      // Start sandbox creation and AI planning in parallel
      this.onUpdate({
        type: "log",
        message: "⚡ Starting sandbox setup and AI planning simultaneously...",
      })

      // Start sandbox creation (async, non-blocking)
      const sandboxPromise = this.createSandboxAsync()
      
      // Start AI planning immediately (parallel to sandbox creation)
      const planningPromise = this.generateProjectPlan()

      // Wait for planning to complete first (usually faster than sandbox)
      this.onUpdate({
        type: "log",
        message: "🧠 AI planning in progress...",
      })
      
      const files = await planningPromise
      
      this.onUpdate({
        type: "log",
        message: `✓ AI planning completed: ${files.length} files planned`,
      })

      // Filter out pre-provided files
      const configFiles = ["package.json", "tsconfig.json", "tailwind.config.js", "postcss.config.mjs", "next.config.js", "lib/utils.ts"]
      const filteredFiles = files.filter(file => 
        !file.startsWith("components/ui/") && 
        !configFiles.includes(file)
      )
      
      if (filteredFiles.length !== files.length) {
        this.onUpdate({
          type: "log",
          message: `Filtered out ${files.length - filteredFiles.length} pre-provided files from generation list`,
        })
      }

      // Start generating files in memfs immediately (parallel to sandbox setup)
      this.onUpdate({
        type: "log",
        message: "🔥 Starting AI code generation in memory...",
      })

      // Generate each file in memfs while sandbox is being created
      for (const filePath of filteredFiles) {
        this.onUpdate({
          type: "status",
          status: "generating",
          currentFile: filePath,
        })

        for await (const result of this.generateFileToMemfs(filePath)) {
          yield result
        }
      }

      this.onUpdate({
        type: "log",
        message: "✓ All files generated in memory, waiting for sandbox...",
      })

      // Wait for sandbox to be ready
      this.onUpdate({
        type: "log",
        message: "⏳ Waiting for sandbox setup to complete...",
      })
      
      const sandboxId = await sandboxPromise
      
      this.onUpdate({
        type: "log",
        message: `✓ Sandbox ready: ${sandboxId}`,
      })

      // Now transfer all generated files from memfs to sandbox
      await this.transferFilesToSandbox()

      // Build and start the project
      await this.buildProject()

      this.onUpdate({
        type: "complete",
        sandboxId: this.sandbox!.sandboxId,
        previewUrl: this.previewUrl,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      
      // Provide more specific error messages
      let userFriendlyMessage = message;
      if (message.includes("wasn't found") || message.includes("not found")) {
        userFriendlyMessage = "The sandbox has expired or was terminated. Please try generating the project again.";
      } else if (message.includes("timeout") || message.includes("timed out")) {
        userFriendlyMessage = "The operation timed out. Please check your internet connection and try again.";
      } else if (message.includes("API key") || message.includes("authentication")) {
        userFriendlyMessage = "Authentication failed. Please check your E2B API key configuration.";
      } else if (message.includes("quota") || message.includes("limit")) {
        userFriendlyMessage = "API quota exceeded. Please check your E2B account limits.";
      }
      
      this.onUpdate({
        type: "error",
        message: userFriendlyMessage,
      })
      
      this.onUpdate({
        type: "log",
        message: `❌ Generation failed: ${message}`,
      })
      
      throw error
    }
  }

  // Edit functionality methods
  async saveFileEdit(filePath: string, content: string): Promise<void> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized")
    }

    try {
      // Save to sandbox
      await this.sandbox.files.write(filePath, content)
      
      // Also update memfs if the file exists there
      if (this.memfs.has(filePath)) {
        this.memfs.set(filePath, content)
      }

      this.onUpdate({
        type: "log",
        message: `✓ File ${filePath} saved successfully`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      throw new Error(`Failed to save file ${filePath}: ${message}`)
    }
  }

  async restartDevServer(): Promise<void> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized")
    }

    try {
      this.onUpdate({
        type: "log",
        message: "Restarting development server...",
      })

      // Kill existing dev server processes
      await this.sandbox.commands.run("pkill -f 'next dev' || true", { timeoutMs: 5000 })
      await this.sandbox.commands.run("pkill -f 'node.*next' || true", { timeoutMs: 5000 })
      
      // Wait a moment for processes to terminate
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Start new dev server in background
      this.sandbox.commands.run("nohup npm run dev > /tmp/next.log 2>&1 &", { timeoutMs: 0 }).catch(() => {
        // Ignore errors for background process
      })

      this.onUpdate({
        type: "log",
        message: "✓ Development server restarted",
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      throw new Error(`Failed to restart dev server: ${message}`)
    }
  }

  async readFileContent(filePath: string): Promise<string> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized")
    }

    try {
      const content = await this.sandbox.files.read(filePath)
      return content
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      throw new Error(`Failed to read file ${filePath}: ${message}`)
    }
  }

  async getProjectFiles(): Promise<string[]> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized")
    }

    try {
      // Get files from memfs and sandbox
      const memfsFiles = Array.from(this.memfs.keys())
      
      // Try to get additional files from sandbox
      const result = await this.sandbox.commands.run("find . -name '*.tsx' -o -name '*.ts' -o -name '*.css' | grep -v node_modules | grep -v .next | head -20", { timeoutMs: 10000 })
      
      const sandboxFiles = result.stdout
        ? result.stdout.split('\n')
            .filter(line => line.trim())
            .map(line => line.replace(/^\.\//, ''))
        : []

      // Combine and deduplicate
      const allFilesSet = new Set([...memfsFiles, ...sandboxFiles])
      const allFiles = Array.from(allFilesSet)
      return allFiles.filter(file => file && !file.startsWith('node_modules/') && !file.startsWith('.next/'))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      throw new Error(`Failed to get project files: ${message}`)
    }
  }

  // Cleanup method
  async cleanup(): Promise<void> {
    // Clear memfs
    this.memfs.clear()
    
    // Currently no specific cleanup needed, but could close sandbox connections here
    // if needed in the future
    this.onUpdate({
      type: "log",
      message: "Project orchestrator cleaned up",
    })
  }
}
