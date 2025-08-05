"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Home, ArrowLeft } from "lucide-react"

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="p-8 max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <h2 className="text-2xl font-semibold">Page Not Found</h2>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => router.back()} variant="outline" className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
          <Button onClick={() => router.push("/")} className="flex-1">
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
        </div>
      </Card>
    </div>
  )
}
