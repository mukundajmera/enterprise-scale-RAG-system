'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DocumentUpload } from '@/components/document-upload';

export default function UploadPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Upload Documents</h1>
          <p className="text-muted-foreground">
            Upload PDF, TXT, or Markdown files to your document library.
          </p>
        </div>
      </div>

      {/* Upload Component */}
      <DocumentUpload
        onUploadComplete={(response) => {
          // Navigate to dashboard after successful upload
          console.log('Upload complete:', response);
        }}
      />

      {/* Tips */}
      <div className="rounded-lg border bg-muted/30 p-6">
        <h3 className="font-semibold mb-3">Upload Tips</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Maximum file size is 50MB per document</li>
          <li>• Supported formats: PDF, TXT, MD, DOC, DOCX</li>
          <li>• Documents are processed automatically after upload</li>
          <li>• Processing time depends on document size and complexity</li>
          <li>• You can upload multiple files at once</li>
        </ul>
      </div>
    </div>
  );
}
