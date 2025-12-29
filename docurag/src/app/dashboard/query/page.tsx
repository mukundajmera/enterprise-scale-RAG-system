'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryInterface } from '@/components/query-interface';
import type { DocumentInfo } from '@/types';

export default function QueryPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const response = await fetch('/api/documents');
        if (!response.ok) {
          throw new Error('Failed to fetch documents');
        }
        const data = await response.json();
        setDocuments(data.documents || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load documents');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocuments();
  }, []);

  const readyDocuments = documents.filter((d) => d.status === 'ready');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Ask Questions</h1>
          <p className="text-muted-foreground">
            Query your documents using natural language and get AI-powered answers.
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Documents State */}
      {!isLoading && !error && readyDocuments.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No documents ready for querying</h3>
              <p className="text-muted-foreground mb-4">
                {documents.length === 0
                  ? 'Upload some documents first to start asking questions.'
                  : 'Your documents are still being processed. Please wait.'}
              </p>
              <Button onClick={() => router.push('/dashboard/upload')}>Upload Documents</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Query Interface */}
      {!isLoading && !error && readyDocuments.length > 0 && (
        <QueryInterface documents={documents} />
      )}

      {/* Tips */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Query Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Be specific with your questions for more accurate answers</li>
            <li>• You can filter by specific documents if needed</li>
            <li>• Answers include source citations for verification</li>
            <li>• Confidence scores indicate how well the answer matches source material</li>
            <li>• Press Enter to send, Shift+Enter for a new line</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
