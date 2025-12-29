import Link from 'next/link';
import { ArrowRight, FileText, MessageSquare, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">DocuRAG</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Enterprise Document Intelligence{' '}
            <span className="text-primary">Powered by AI</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Upload your documents, ask questions in natural language, and get accurate answers with
            source citations. Built for enterprise scale with security and reliability.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up">
              <Button size="lg" className="w-full sm:w-auto">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Learn More
              </Button>
            </Link>
          </div>
        </div>

        {/* Demo Preview */}
        <div className="mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />
          <div className="border rounded-xl shadow-2xl bg-card overflow-hidden">
            <div className="bg-muted px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-4 text-sm text-muted-foreground">DocuRAG Dashboard</span>
            </div>
            <div className="p-8 bg-muted/30">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="h-40 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Drop your documents here</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-24 rounded-lg bg-muted/50 border p-4">
                    <p className="text-muted-foreground text-sm italic">
                      &quot;What are the key findings in the Q3 report?&quot;
                    </p>
                  </div>
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <p className="text-sm">
                      According to the Q3 report, the key findings include a 15% increase in
                      revenue...
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Source: Q3-Report.pdf, Page 12
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need for Document Intelligence
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <FileText className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Multi-Format Support</CardTitle>
                <CardDescription>
                  Upload PDF, Word, TXT, and Markdown files up to 50MB each.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <MessageSquare className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Natural Language Q&A</CardTitle>
                <CardDescription>
                  Ask questions in plain English and get accurate, contextual answers.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Enterprise Security</CardTitle>
                <CardDescription>
                  Your data is encrypted and isolated. We never train on your documents.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Streaming Responses</CardTitle>
                <CardDescription>
                  Get real-time streaming answers with source citations and confidence scores.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 text-center">
          <div className="bg-primary/5 rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Join thousands of teams using DocuRAG to unlock insights from their documents.
            </p>
            <Link href="/sign-up">
              <Button size="lg">
                Create Free Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} DocuRAG. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
