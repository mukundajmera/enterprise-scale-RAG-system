import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents, users } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { deleteDocument } from '@/lib/storage';
import { deleteDocumentVectors } from '@/lib/vector-store';

// GET /api/documents - List all documents for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);

    if (!user) {
      return NextResponse.json({ documents: [] });
    }

    // Get pagination params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Fetch documents
    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, user.id))
      .orderBy(desc(documents.createdAt))
      .limit(limit)
      .offset(offset);

    // Format response
    const formattedDocs = docs.map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      status: doc.status,
      chunkCount: doc.chunkCount,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      errorMessage: doc.errorMessage,
    }));

    return NextResponse.json({
      documents: formattedDocs,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

// DELETE /api/documents?id=xxx - Delete a specific document
export async function DELETE(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Get user
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get document and verify ownership
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, user.id)))
      .limit(1);

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete from storage
    try {
      await deleteDocument(doc.storageUrl);
    } catch (storageError) {
      console.error('Failed to delete from storage:', storageError);
      // Continue with database deletion even if storage fails
    }

    // Delete vectors from Qdrant
    try {
      await deleteDocumentVectors(user.id, documentId);
    } catch (vectorError) {
      console.error('Failed to delete vectors:', vectorError);
      // Continue with database deletion
    }

    // Delete from database (cascades to chunks)
    await db.delete(documents).where(eq(documents.id, documentId));

    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
