import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

export const metadata: Metadata = {
  title: 'DocuRAG - Enterprise Document Intelligence Platform',
  description:
    'Upload documents, ask questions, and get accurate answers with source citations powered by AI.',
  keywords: ['RAG', 'AI', 'Document Intelligence', 'Question Answering', 'Enterprise'],
  authors: [{ name: 'DocuRAG Team' }],
  openGraph: {
    title: 'DocuRAG - Enterprise Document Intelligence Platform',
    description: 'AI-powered document question answering with source citations',
    type: 'website',
  },
};

// Disable static prerendering for pages that use Clerk
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Check if Clerk is configured
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const hasClerkConfig = clerkKey && clerkKey.startsWith('pk_');

  // Render without Clerk provider if not configured (for local dev without auth)
  if (!hasClerkConfig) {
    return (
      <html lang="en" suppressHydrationWarning>
        <body className="font-sans antialiased">
          {children}
          <Toaster />
        </body>
      </html>
    );
  }

  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="font-sans antialiased">
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
