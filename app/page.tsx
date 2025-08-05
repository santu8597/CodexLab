"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Sparkles, Code2, Zap, Rocket } from "lucide-react"

export default function Home() {
  const [prompt, setPrompt] = useState("")
  const router = useRouter()

  const handleGenerate = () => {
    if (!prompt.trim()) return
    
    // Redirect to code view page with the prompt
    const encodedPrompt = encodeURIComponent(prompt)
    router.push(`/generate?prompt=${encodedPrompt}`)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleGenerate()
    }
  }

  const examplePrompts = [
    "Build a modern task management app with Next.js and TypeScript",
    "Create a blog website with dark mode and responsive design",
    "Build an e-commerce store with product catalog and shopping cart",
    "Create a dashboard with charts and analytics",
    "Build a portfolio website with animations and contact form",
    "Create a weather app with location-based forecasts"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">AI Project Generator</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Powered by AI
            </div>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
              Build Projects with
              <span className="text-primary"> AI Magic</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Describe your project idea and watch as AI generates a complete Next.js application with modern design and best practices.
            </p>
          </div>

          {/* Input Section */}
          <Card className="p-6 shadow-lg">
            <div className="space-y-4">
              <Textarea
                placeholder="Describe the project you want to build... (e.g., 'Build a modern task management app with user authentication and real-time updates')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyPress}
                className="min-h-[120px] text-lg resize-none border-2 focus:border-primary/50"
                autoFocus
              />
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Press <kbd className="px-2 py-1 text-xs bg-muted rounded">Ctrl</kbd> + <kbd className="px-2 py-1 text-xs bg-muted rounded">Enter</kbd> to generate
                </p>
                <Button 
                  onClick={handleGenerate} 
                  disabled={!prompt.trim()} 
                  size="lg"
                  className="min-w-[120px]"
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Generate
                </Button>
              </div>
            </div>
          </Card>

          {/* Example Prompts */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">Try these examples:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {examplePrompts.map((example, index) => (
                <Card 
                  key={index}
                  className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group"
                  onClick={() => setPrompt(example)}
                >
                  <p className="text-sm group-hover:text-primary transition-colors">
                    {example}
                  </p>
                </Card>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold">Lightning Fast</h4>
              <p className="text-sm text-muted-foreground">
                Generate complete projects in minutes, not hours
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <Code2 className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold">Modern Stack</h4>
              <p className="text-sm text-muted-foreground">
                Next.js 14, TypeScript, Tailwind CSS, and shadcn/ui
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h4 className="font-semibold">Production Ready</h4>
              <p className="text-sm text-muted-foreground">
                Clean code with best practices and modern design
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <p className="text-center text-sm text-muted-foreground">
            Built with Next.js and AI • Open Source
          </p>
        </div>
      </div>
    </div>
  )
}
