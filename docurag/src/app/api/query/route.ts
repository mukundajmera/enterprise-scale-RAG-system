import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, queries, documents } from '@/db/schema';
import { checkRateLimit } from '@/lib/rate-limit';
import { generateQueryEmbedding } from '@/lib/embeddings';
import { searchVectors } from '@/lib/vector-store';
import { generateRAGResponse, detectPotentialHallucination } from '@/lib/llm';
import { getConfidenceLevel } from '@/lib/utils';
import { eq, inArray } from 'drizzle-orm';
import type { QuerySource } from '@/types';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Authenticate user
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit(clerkId, 'query');
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          remaining: rateLimitResult.remaining,
        },
        { status: 429 }
      );
    }

    // Parse request body
    const { query, documentIds } = await request.json();

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Get user
    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(query.trim());

    // Search for similar vectors
    const searchResults = await searchVectors(user.id, queryEmbedding, {
      documentIds: documentIds?.length > 0 ? documentIds : undefined,
    });

    // If no results found, return a message
    if (searchResults.length === 0) {
      const noResultsAnswer =
        "I couldn't find any relevant information in your documents to answer this question. Please try rephrasing your question or upload more relevant documents.";

      // Save query to database
      await db.insert(queries).values({
        userId: user.id,
        query: query.trim(),
        answer: noResultsAnswer,
        sources: [],
        confidence: 'Low',
        tokenCount: 0,
        latencyMs: Date.now() - startTime,
        documentIds: documentIds || [],
      });

      // Stream the response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const words = noResultsAnswer.split(' ');
          let index = 0;

          const interval = setInterval(() => {
            if (index < words.length) {
              controller.enqueue(encoder.encode(words[index] + ' '));
              index++;
            } else {
              controller.enqueue(encoder.encode('\n\n__SOURCES__:[]\n'));
              controller.enqueue(encoder.encode('__CONFIDENCE__:Low\n'));
              clearInterval(interval);
              controller.close();
            }
          }, 30);
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Get document info for sources
    const docIds = [...new Set(searchResults.map((r) => r.payload.doc_id))];
    const docInfoList = await db
      .select({ id: documents.id, fileName: documents.fileName })
      .from(documents)
      .where(inArray(documents.id, docIds));

    const docNameMap = new Map(docInfoList.map((d) => [d.id, d.fileName]));

    // Prepare contexts for RAG
    const contexts = searchResults.map((result) => ({
      content: result.payload.content,
      page: result.payload.page,
      docId: result.payload.doc_id,
      score: result.score,
    }));

    // Generate RAG response
    const { answer, tokenCount } = await generateRAGResponse(query.trim(), contexts);

    // Calculate confidence based on search scores
    const avgScore = searchResults.reduce((sum, r) => sum + r.score, 0) / searchResults.length;
    const hasHallucination = detectPotentialHallucination(
      answer,
      contexts.map((c) => ({ content: c.content }))
    );
    const confidence = hasHallucination ? 'Low' : getConfidenceLevel(avgScore);

    // Format sources
    const sources: QuerySource[] = searchResults.map((result) => ({
      docId: result.payload.doc_id,
      chunkId: result.payload.chunk_id,
      score: result.score,
      page: result.payload.page,
      text: result.payload.content.substring(0, 300),
      fileName: docNameMap.get(result.payload.doc_id),
    }));

    const latencyMs = Date.now() - startTime;

    // Save query to database
    await db.insert(queries).values({
      userId: user.id,
      query: query.trim(),
      answer,
      sources,
      confidence,
      tokenCount,
      latencyMs,
      documentIds: documentIds || [],
    });

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const words = answer.split(' ');
        let index = 0;

        const interval = setInterval(() => {
          if (index < words.length) {
            controller.enqueue(encoder.encode(words[index] + ' '));
            index++;
          } else {
            // Send metadata at end
            controller.enqueue(encoder.encode(`\n\n__SOURCES__:${JSON.stringify(sources)}\n`));
            controller.enqueue(encoder.encode(`__CONFIDENCE__:${confidence}\n`));
            clearInterval(interval);
            controller.close();
          }
        }, 30);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Query error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your query.' },
      { status: 500 }
    );
  }
}
