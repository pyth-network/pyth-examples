import Link from "next/link"
import { Github, Twitter, MessageCircle } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-card py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                <img src="/logo.png" alt="The Social Pot" width={40} height={40} className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-bold">The Social Pot</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The smart lottery that pays you monthly and funds social projects. WIN. GIVE. GROW.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Platform</h4>
            <div className="space-y-2">
              <Link
                href="/tickets"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Buy Tickets
              </Link>
              <Link
                href="/dashboard"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/#how-it-works"
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                How It Works
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <div className="space-y-2">
              <a href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Documentation
              </a>
              <a href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Smart Contracts
              </a>
              <a href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Audit Report
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Community</h4>
            <div className="flex gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="w-5 h-5" />
                <span className="sr-only">Twitter</span>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Github className="w-5 h-5" />
                <span className="sr-only">GitHub</span>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <MessageCircle className="w-5 h-5" />
                <span className="sr-only">Discord</span>
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">© 2025 The Social Pot. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
