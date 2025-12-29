'use client';

import * as React from 'react';
import { useCallback, useState } from 'react';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { formatBytes, isAllowedFileType } from '@/lib/utils';
import { MAX_FILE_SIZE, MAX_FILE_SIZE_DISPLAY, ALLOWED_FILE_EXTENSIONS } from '@/config/constants';
import type { DocumentUploadResponse } from '@/types';

interface FileWithPreview {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface DocumentUploadProps {
  onUploadComplete?: (response: DocumentUploadResponse) => void;
}

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const { toast } = useToast();

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > MAX_FILE_SIZE) {
        return `File is too large. Maximum size is ${MAX_FILE_SIZE_DISPLAY}.`;
      }

      if (!isAllowedFileType(file.type)) {
        return `Invalid file type. Allowed types: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`;
      }

      return null;
    },
    []
  );

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const validFiles: FileWithPreview[] = [];

      for (const file of fileArray) {
        const error = validateFile(file);
        if (error) {
          toast({
            title: 'Invalid file',
            description: `${file.name}: ${error}`,
            variant: 'destructive',
          });
          continue;
        }

        validFiles.push({
          file,
          id: crypto.randomUUID(),
          progress: 0,
          status: 'pending',
        });
      }

      setFiles((prev) => [...prev, ...validFiles]);
    },
    [validateFile, toast]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const uploadFile = useCallback(
    async (fileWithPreview: FileWithPreview) => {
      const { file, id } = fileWithPreview;

      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'uploading' as const, progress: 10 } : f))
      );

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Upload failed');
        }

        const data: DocumentUploadResponse = await response.json();

        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: 'success' as const, progress: 100 } : f
          )
        );

        toast({
          title: 'Upload successful',
          description: `${file.name} has been uploaded and is being processed.`,
          variant: 'default',
        });

        onUploadComplete?.(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';

        setFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: 'error' as const, error: errorMessage } : f
          )
        );

        toast({
          title: 'Upload failed',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    },
    [toast, onUploadComplete]
  );

  const uploadAllFiles = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    for (const file of pendingFiles) {
      await uploadFile(file);
    }
  }, [files, uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);
      }
    },
    [addFiles]
  );

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const isUploading = files.some((f) => f.status === 'uploading');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Documents</CardTitle>
        <CardDescription>
          Upload PDF, TXT, or Markdown files up to {MAX_FILE_SIZE_DISPLAY} each.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop zone */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept={ALLOWED_FILE_EXTENSIONS.join(',')}
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Upload files"
          />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Drag and drop files here, or click to browse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Supported formats: {ALLOWED_FILE_EXTENSIONS.join(', ')}
          </p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((fileWithPreview) => (
              <div
                key={fileWithPreview.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <FileText className="h-8 w-8 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileWithPreview.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(fileWithPreview.file.size)}
                  </p>
                  {fileWithPreview.status === 'uploading' && (
                    <Progress value={fileWithPreview.progress} className="mt-1 h-1" />
                  )}
                  {fileWithPreview.status === 'error' && (
                    <p className="text-xs text-destructive mt-1">{fileWithPreview.error}</p>
                  )}
                </div>
                <div className="shrink-0">
                  {fileWithPreview.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(fileWithPreview.id)}
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {fileWithPreview.status === 'uploading' && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  {fileWithPreview.status === 'success' && (
                    <span className="text-xs text-green-600 font-medium">Done</span>
                  )}
                  {fileWithPreview.status === 'error' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => uploadFile(fileWithPreview)}
                      className="text-xs"
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        {pendingCount > 0 && (
          <Button onClick={uploadAllFiles} disabled={isUploading} className="w-full">
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {pendingCount} file{pendingCount !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
