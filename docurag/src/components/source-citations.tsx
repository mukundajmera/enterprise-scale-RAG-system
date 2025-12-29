'use client';

import * as React from 'react';
import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getConfidenceLevel, getConfidenceColor, truncateText } from '@/lib/utils';
import type { QuerySource } from '@/types';

interface SourceCitationsProps {
  sources: QuerySource[];
  maxPreviewLength?: number;
}

export function SourceCitations({ sources, maxPreviewLength = 200 }: SourceCitationsProps) {
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());

  const toggleSource = (index: number) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Sources ({sources.length})
      </h3>
      <div className="space-y-2">
        {sources.map((source, index) => {
          const isExpanded = expandedSources.has(index);
          const confidence = getConfidenceLevel(source.score);
          const relevancePercent = Math.round(source.score * 100);

          return (
            <Card key={`${source.docId}-${source.chunkId}-${index}`} className="overflow-hidden">
              <CardHeader className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <span className="text-muted-foreground">[{index + 1}]</span>
                      {source.fileName && (
                        <span className="truncate">{source.fileName}</span>
                      )}
                      {source.page && (
                        <span className="text-muted-foreground text-xs">
                          Page {source.page}
                        </span>
                      )}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={getConfidenceColor(confidence)}>
                      {relevancePercent}% match
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSource(index)}
                      className="h-7 w-7 p-0"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <p className="text-sm text-muted-foreground">
                  {isExpanded ? source.text : truncateText(source.text, maxPreviewLength)}
                </p>
                {source.text.length > maxPreviewLength && !isExpanded && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => toggleSource(index)}
                    className="p-0 h-auto text-xs"
                  >
                    Show more
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
