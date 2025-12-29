import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents, users } from '@/db/schema';
import { uploadDocument } from '@/lib/storage';
import { checkRateLimit } from '@/lib/rate-limit';
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from '@/config/constants';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(clerkId, 'upload');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          remaining: rateLimitResult.remaining,
          reset: rateLimitResult.reset,
        },
        { status: 429 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    // Validate file presence
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type as (typeof ALLOWED_FILE_TYPES)[number])) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed types: PDF, TXT, MD, DOC, DOCX.' },
        { status: 400 }
      );
    }

    // Get or create user in database
    let [user] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);

    if (!user) {
      // Try to get email from Clerk user context
      const clerkUser = await currentUser();
      const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;

      if (!userEmail) {
        return NextResponse.json(
          { error: 'Unable to retrieve user email from authentication provider.' },
          { status: 400 }
        );
      }

      // Create new user with actual email from Clerk
      [user] = await db
        .insert(users)
        .values({
          clerkId,
          email: userEmail,
          name: clerkUser?.firstName
            ? `${clerkUser.firstName}${clerkUser.lastName ? ' ' + clerkUser.lastName : ''}`
            : null,
          imageUrl: clerkUser?.imageUrl || null,
        })
        .returning();
    }

    // Upload file to storage
    const storageUrl = await uploadDocument(file, user.id);

    // Create document record
    const [doc] = await db
      .insert(documents)
      .values({
        userId: user.id,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        storageUrl,
        status: 'processing',
      })
      .returning();

    // Trigger async processing (call Python worker)
    if (process.env.WORKER_URL) {
      try {
        const workerResponse = await fetch(`${process.env.WORKER_URL}/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document_id: doc.id,
            storage_url: storageUrl,
            user_id: user.id,
          }),
        });

        if (!workerResponse.ok) {
          console.error('Worker processing request failed:', await workerResponse.text());
        }
      } catch (workerError) {
        console.error('Failed to send processing request to worker:', workerError);
        // Don't fail the upload - document is stored, processing can be retried
      }
    } else {
      console.warn('WORKER_URL not configured. Document processing skipped.');
    }

    return NextResponse.json({
      id: doc.id,
      status: doc.status,
      message: 'Document uploaded successfully and is being processed.',
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'An error occurred while uploading the document.' },
      { status: 500 }
    );
  }
}
