'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Upload,
  MessageSquare,
  Clock,
  HardDrive,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBytes, formatRelativeTime } from '@/lib/utils';
import { STATUS_COLORS } from '@/config/constants';
import type { DocumentInfo } from '@/types';

export default function DashboardPage() {
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

  const stats = {
    total: documents.length,
    ready: documents.filter((d) => d.status === 'ready').length,
    processing: documents.filter((d) => d.status === 'processing').length,
    totalSize: documents.reduce((acc, d) => acc + d.fileSize, 0),
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage your documents and ask questions about them.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/dashboard/upload">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Upload Documents</CardTitle>
                <CardDescription>Add new PDF, TXT, or Markdown files</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/query">
          <Card className="hover:shadow-md transition-shadow cursor-pointer group">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Ask Questions</CardTitle>
                <CardDescription>Query your documents with AI</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{stats.ready}</p>
                <p className="text-sm text-muted-foreground">Ready to Query</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Loader2
                className={`h-8 w-8 text-muted-foreground ${stats.processing > 0 ? 'animate-spin' : ''}`}
              />
              <div>
                <p className="text-2xl font-bold">{stats.processing}</p>
                <p className="text-sm text-muted-foreground">Processing</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <HardDrive className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{formatBytes(stats.totalSize)}</p>
                <p className="text-sm text-muted-foreground">Storage Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>Your recently uploaded documents</CardDescription>
          </div>
          <Link href="/dashboard/upload">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No documents yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload your first document to get started.
              </p>
              <Link href="/dashboard/upload">
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Document
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.slice(0, 5).map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatBytes(doc.fileSize)} • {formatRelativeTime(doc.createdAt)}
                    </p>
                  </div>
                  <Badge
                    className={
                      STATUS_COLORS[doc.status as keyof typeof STATUS_COLORS] ||
                      STATUS_COLORS.processing
                    }
                  >
                    {doc.status}
                  </Badge>
                </div>
              ))}
              {documents.length > 5 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  And {documents.length - 5} more documents...
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
