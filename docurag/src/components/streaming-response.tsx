'use client';

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreamingResponseProps {
  text: string;
  isStreaming: boolean;
  className?: string;
}

export function StreamingResponse({ text, isStreaming, className }: StreamingResponseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayText, setDisplayText] = useState('');

  // Animate text display for smoother streaming effect
  useEffect(() => {
    setDisplayText(text);
  }, [text]);

  // Auto-scroll to bottom as content streams
  useEffect(() => {
    if (containerRef.current && isStreaming) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayText, isStreaming]);

  if (!displayText && !isStreaming) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative p-4 rounded-lg border bg-muted/30 overflow-y-auto',
        className
      )}
    >
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p className="whitespace-pre-wrap leading-relaxed">{displayText}</p>
      </div>
      
      {isStreaming && (
        <span className="inline-flex items-center gap-1 ml-1">
          <span className="w-2 h-4 bg-primary/70 animate-pulse" />
        </span>
      )}

      {isStreaming && !displayText && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Generating response...</span>
        </div>
      )}
    </div>
  );
}

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}

export function TypewriterText({ 
  text, 
  speed = 20, 
  onComplete, 
  className 
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) return;

    let index = 0;
    setDisplayedText('');
    setIsComplete(false);

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </span>
  );
}
