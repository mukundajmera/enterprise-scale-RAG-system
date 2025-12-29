import { v1 as aiplatform } from '@google-cloud/aiplatform';
import { RAG_CONFIG } from '@/config/constants';

const { PredictionServiceClient } = aiplatform;

// Initialize Vertex AI client
let predictionClient: aiplatform.PredictionServiceClient | null = null;

function getPredictionClient(): aiplatform.PredictionServiceClient {
  if (!predictionClient) {
    if (!process.env.GCP_PROJECT_ID) {
      throw new Error('GCP_PROJECT_ID environment variable is not set');
    }

    const credentials = process.env.GCP_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY)
      : undefined;

    const location = process.env.VERTEX_AI_LOCATION || 'us-central1';

    predictionClient = new PredictionServiceClient({
      apiEndpoint: `${location}-aiplatform.googleapis.com`,
      credentials,
    });
  }

  return predictionClient;
}

/**
 * Generate embeddings using Vertex AI text-embedding-004 model
 * @param texts - Array of texts to embed
 * @returns Array of embedding vectors (768 dimensions each)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const client = getPredictionClient();
  const projectId = process.env.GCP_PROJECT_ID!;
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';

  // Vertex AI endpoint for text embeddings
  const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/text-embedding-004`;

  try {
    // Process in batches (max 250 texts per batch for Vertex AI)
    const batchSize = 250;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const instances = batch.map((text) => ({
        structValue: {
          fields: {
            content: { stringValue: text },
            task_type: { stringValue: 'RETRIEVAL_DOCUMENT' },
          },
        },
      }));

      const [response] = await client.predict({
        endpoint,
        instances,
      });

      if (response.predictions) {
        for (const prediction of response.predictions) {
          const embedding =
            prediction.structValue?.fields?.embeddings?.structValue?.fields?.values?.listValue
              ?.values;

          if (embedding) {
            const vector = embedding.map((v) => v.numberValue || 0);
            allEmbeddings.push(vector);
          }
        }
      }
    }

    return allEmbeddings;
  } catch (error) {
    console.error('Failed to generate embeddings:', error);
    throw new Error('Failed to generate embeddings');
  }
}

/**
 * Generate embedding for a single query (optimized for retrieval)
 * @param query - The query text to embed
 * @returns Embedding vector (768 dimensions)
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const client = getPredictionClient();
  const projectId = process.env.GCP_PROJECT_ID!;
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';

  const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/text-embedding-004`;

  try {
    const instances = [
      {
        structValue: {
          fields: {
            content: { stringValue: query },
            task_type: { stringValue: 'RETRIEVAL_QUERY' },
          },
        },
      },
    ];

    const [response] = await client.predict({
      endpoint,
      instances,
    });

    if (response.predictions && response.predictions[0]) {
      const embedding =
        response.predictions[0].structValue?.fields?.embeddings?.structValue?.fields?.values
          ?.listValue?.values;

      if (embedding) {
        return embedding.map((v) => v.numberValue || 0);
      }
    }

    throw new Error('No embedding returned from Vertex AI');
  } catch (error) {
    console.error('Failed to generate query embedding:', error);
    throw new Error('Failed to generate query embedding');
  }
}

/**
 * Validate embedding dimensions
 */
export function validateEmbedding(embedding: number[]): boolean {
  return (
    Array.isArray(embedding) &&
    embedding.length === RAG_CONFIG.EMBEDDING_DIMENSIONS &&
    embedding.every((v) => typeof v === 'number' && !isNaN(v))
  );
}
