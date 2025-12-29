'use client';

import * as React from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Loader2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getConfidenceColor } from '@/lib/utils';
import type { QuerySource, DocumentInfo } from '@/types';
import { SourceCitations } from './source-citations';

interface QueryInterfaceProps {
  documents?: DocumentInfo[];
}

export function QueryInterface({ documents = [] }: QueryInterfaceProps) {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<QuerySource[]>([]);
  const [confidence, setConfidence] = useState<'High' | 'Medium' | 'Low' | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [showDocSelector, setShowDocSelector] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Scroll answer into view as it streams
  useEffect(() => {
    if (isStreaming && answerRef.current) {
      answerRef.current.scrollTop = answerRef.current.scrollHeight;
    }
  }, [answer, isStreaming]);

  const handleQuery = useCallback(async () => {
    if (!query.trim()) {
      toast({
        title: 'Query required',
        description: 'Please enter a question to ask.',
        variant: 'destructive',
      });
      return;
    }

    // Reset state
    setAnswer('');
    setSources([]);
    setConfidence(null);
    setIsStreaming(true);

    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          documentIds: selectedDocIds.length > 0 ? selectedDocIds : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Query failed');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Check for metadata markers
        if (buffer.includes('__SOURCES__:')) {
          const parts = buffer.split('__SOURCES__:');
          setAnswer((prev) => prev + parts[0]);

          const sourcesMatch = parts[1].match(/^([^\n]+)/);
          if (sourcesMatch) {
            try {
              const parsedSources = JSON.parse(sourcesMatch[1]);
              setSources(parsedSources);
            } catch {
              console.error('Failed to parse sources');
            }
          }
          buffer = parts[1].replace(/^[^\n]+\n?/, '');
        } else if (buffer.includes('__CONFIDENCE__:')) {
          const parts = buffer.split('__CONFIDENCE__:');
          const confMatch = parts[1].match(/^(High|Medium|Low)/);
          if (confMatch) {
            setConfidence(confMatch[1] as 'High' | 'Medium' | 'Low');
          }
          buffer = parts[1].replace(/^[^\n]+\n?/, '');
        } else {
          // Stream the answer
          setAnswer((prev) => prev + buffer);
          buffer = '';
        }
      }

      // Process any remaining buffer
      if (buffer && !buffer.includes('__')) {
        setAnswer((prev) => prev + buffer);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Query failed';
      toast({
        title: 'Query failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsStreaming(false);
    }
  }, [query, selectedDocIds, toast]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleQuery();
      }
    },
    [handleQuery]
  );

  const toggleDocument = useCallback((docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  }, []);

  const readyDocuments = documents.filter((doc) => doc.status === 'ready');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ask a Question</CardTitle>
        <CardDescription>
          Ask questions about your uploaded documents. The AI will provide answers with citations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Document selector */}
        {readyDocuments.length > 0 && (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDocSelector(!showDocSelector)}
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {selectedDocIds.length === 0
                  ? 'All documents'
                  : `${selectedDocIds.length} document${selectedDocIds.length !== 1 ? 's' : ''} selected`}
              </span>
              {showDocSelector ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {showDocSelector && (
              <div className="border rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto">
                {readyDocuments.map((doc) => (
                  <label
                    key={doc.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(doc.id)}
                      onChange={() => toggleDocument(doc.id)}
                      className="rounded border-input"
                    />
                    <span className="text-sm truncate">{doc.fileName}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Query input */}
        <div className="space-y-2">
          <Textarea
            placeholder="Ask a question about your documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[100px] resize-none"
            disabled={isStreaming}
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">Press Enter to send, Shift+Enter for new line</p>
            <Button onClick={handleQuery} disabled={isStreaming || !query.trim()}>
              {isStreaming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Ask
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Answer */}
        {(answer || isStreaming) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Answer</h3>
              {confidence && (
                <Badge className={getConfidenceColor(confidence)}>{confidence} Confidence</Badge>
              )}
            </div>
            <div
              ref={answerRef}
              className="p-4 border rounded-lg bg-muted/50 max-h-[400px] overflow-y-auto"
            >
              <p className="whitespace-pre-wrap text-sm">{answer}</p>
              {isStreaming && <span className="inline-block w-2 h-4 bg-primary animate-pulse" />}
            </div>
          </div>
        )}

        {/* Sources */}
        {sources.length > 0 && <SourceCitations sources={sources} />}
      </CardContent>
    </Card>
  );
}
