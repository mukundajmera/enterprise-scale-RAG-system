import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Webhook endpoint for the Python worker to update document processing status
 * WORKER_SECRET is required in production environments for security.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify request comes from worker
    const authHeader = request.headers.get('X-Worker-Secret');
    const workerSecret = process.env.WORKER_SECRET;
    const isProduction = process.env.NODE_ENV === 'production';

    // In production, WORKER_SECRET is required
    if (isProduction && !workerSecret) {
      console.error('WORKER_SECRET environment variable is required in production');
      return NextResponse.json(
        { error: 'Server misconfiguration: authentication not configured' },
        { status: 500 }
      );
    }

    // Validate the secret if configured
    if (workerSecret && authHeader !== workerSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { document_id, status, chunk_count, error_message } = body;

    if (!document_id) {
      return NextResponse.json({ error: 'document_id is required' }, { status: 400 });
    }

    // Validate status
    const validStatuses = ['processing', 'ready', 'failed'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Update document
    const updateData: {
      status?: 'processing' | 'ready' | 'failed';
      chunkCount?: number;
      errorMessage?: string;
      updatedAt?: Date;
    } = {
      updatedAt: new Date(),
    };

    if (status) {
      updateData.status = status;
    }

    if (typeof chunk_count === 'number') {
      updateData.chunkCount = chunk_count;
    }

    if (error_message) {
      updateData.errorMessage = error_message;
    }

    await db.update(documents).set(updateData).where(eq(documents.id, document_id));

    return NextResponse.json({
      success: true,
      message: 'Document status updated',
    });
  } catch (error) {
    console.error('Process webhook error:', error);
    return NextResponse.json({ error: 'Failed to update document status' }, { status: 500 });
  }
}
