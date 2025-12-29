import { QdrantClient } from '@qdrant/js-client-rest';
import { RAG_CONFIG } from '@/config/constants';

// Initialize Qdrant client
let qdrantClient: QdrantClient | null = null;

function getQdrantClient(): QdrantClient {
  if (!qdrantClient) {
    if (!process.env.QDRANT_URL) {
      throw new Error('QDRANT_URL environment variable is not set');
    }

    qdrantClient = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY,
    });
  }

  return qdrantClient;
}

/**
 * Get collection name for a user
 */
export function getCollectionName(userId: string): string {
  return `user_${userId.replace(/-/g, '_')}`;
}

/**
 * Ensure user collection exists
 */
export async function ensureCollection(userId: string): Promise<void> {
  const client = getQdrantClient();
  const collectionName = getCollectionName(userId);

  try {
    // Check if collection exists
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === collectionName);

    if (!exists) {
      // Create collection with proper vector configuration
      await client.createCollection(collectionName, {
        vectors: {
          size: RAG_CONFIG.EMBEDDING_DIMENSIONS,
          distance: 'Cosine',
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 2,
      });

      // Create payload index for filtering
      await client.createPayloadIndex(collectionName, {
        field_name: 'doc_id',
        field_schema: 'keyword',
      });

      console.log(`Created collection: ${collectionName}`);
    }
  } catch (error) {
    console.error('Failed to ensure collection:', error);
    throw new Error('Failed to initialize vector store');
  }
}

/**
 * Store vectors in Qdrant
 */
export async function storeVectors(
  userId: string,
  vectors: Array<{
    id: string;
    vector: number[];
    payload: {
      doc_id: string;
      chunk_id: string;
      content: string;
      page?: number;
      chunk_index: number;
    };
  }>
): Promise<void> {
  const client = getQdrantClient();
  const collectionName = getCollectionName(userId);

  try {
    await ensureCollection(userId);

    // Upsert vectors in batches
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);

      await client.upsert(collectionName, {
        wait: true,
        points: batch.map((v) => ({
          id: v.id,
          vector: v.vector,
          payload: v.payload,
        })),
      });
    }
  } catch (error) {
    console.error('Failed to store vectors:', error);
    throw new Error('Failed to store vectors in database');
  }
}

/**
 * Search for similar vectors
 */
export async function searchVectors(
  userId: string,
  queryVector: number[],
  options: {
    topK?: number;
    scoreThreshold?: number;
    documentIds?: string[];
  } = {}
): Promise<
  Array<{
    id: string;
    score: number;
    payload: {
      doc_id: string;
      chunk_id: string;
      content: string;
      page?: number;
      chunk_index: number;
    };
  }>
> {
  const client = getQdrantClient();
  const collectionName = getCollectionName(userId);

  const { topK = RAG_CONFIG.TOP_K, scoreThreshold = RAG_CONFIG.SIMILARITY_THRESHOLD, documentIds } =
    options;

  try {
    // Build filter if document IDs provided
    let filter = undefined;
    if (documentIds && documentIds.length > 0) {
      filter = {
        should: documentIds.map((docId) => ({
          key: 'doc_id',
          match: { value: docId },
        })),
      };
    }

    const results = await client.search(collectionName, {
      vector: queryVector,
      limit: topK,
      score_threshold: scoreThreshold,
      filter,
      with_payload: true,
    });

    return results.map((result) => ({
      id: result.id as string,
      score: result.score,
      payload: result.payload as {
        doc_id: string;
        chunk_id: string;
        content: string;
        page?: number;
        chunk_index: number;
      },
    }));
  } catch (error) {
    console.error('Failed to search vectors:', error);
    throw new Error('Failed to search vector database');
  }
}

/**
 * Delete vectors for a document
 */
export async function deleteDocumentVectors(userId: string, documentId: string): Promise<void> {
  const client = getQdrantClient();
  const collectionName = getCollectionName(userId);

  try {
    await client.delete(collectionName, {
      filter: {
        must: [
          {
            key: 'doc_id',
            match: { value: documentId },
          },
        ],
      },
    });
  } catch (error) {
    console.error('Failed to delete document vectors:', error);
    throw new Error('Failed to delete document vectors');
  }
}

/**
 * Get collection stats
 */
export async function getCollectionStats(
  userId: string
): Promise<{ vectorCount: number; indexed: boolean }> {
  const client = getQdrantClient();
  const collectionName = getCollectionName(userId);

  try {
    const info = await client.getCollection(collectionName);

    return {
      vectorCount: info.points_count || 0,
      indexed: info.status === 'green',
    };
  } catch {
    return { vectorCount: 0, indexed: false };
  }
}
