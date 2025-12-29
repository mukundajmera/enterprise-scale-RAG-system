import { v1 as aiplatform } from '@google-cloud/aiplatform';

const { PredictionServiceClient } = aiplatform;

// Initialize Vertex AI client for Gemini
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

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
}

/**
 * Generate a response using Gemini 1.5 Pro via Vertex AI
 */
export async function generateCompletion(
  messages: LLMMessage[],
  options: GenerateOptions = {}
): Promise<{ text: string; tokenCount: number }> {
  const client = getPredictionClient();
  const projectId = process.env.GCP_PROJECT_ID!;
  const location = process.env.VERTEX_AI_LOCATION || 'us-central1';

  const { maxTokens = 2048, temperature = 0.3, topP = 0.95 } = options;

  const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/gemini-1.5-pro`;

  try {
    // Format messages for Gemini
    const contents = messages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }],
    }));

    const instances = [
      {
        structValue: {
          fields: {
            contents: {
              listValue: {
                values: contents.map((c) => ({
                  structValue: {
                    fields: {
                      role: { stringValue: c.role },
                      parts: {
                        listValue: {
                          values: c.parts.map((p) => ({
                            structValue: {
                              fields: {
                                text: { stringValue: p.text },
                              },
                            },
                          })),
                        },
                      },
                    },
                  },
                })),
              },
            },
          },
        },
      },
    ];

    const parameters = {
      structValue: {
        fields: {
          maxOutputTokens: { numberValue: maxTokens },
          temperature: { numberValue: temperature },
          topP: { numberValue: topP },
        },
      },
    };

    const [response] = await client.predict({
      endpoint,
      instances,
      parameters,
    });

    if (response.predictions && response.predictions[0]) {
      const prediction = response.predictions[0];
      const text =
        prediction.structValue?.fields?.candidates?.listValue?.values?.[0]?.structValue?.fields
          ?.content?.structValue?.fields?.parts?.listValue?.values?.[0]?.structValue?.fields?.text
          ?.stringValue || '';

      // Approximate token count (rough estimate)
      const tokenCount = Math.ceil(text.split(/\s+/).length * 1.3);

      return { text, tokenCount };
    }

    throw new Error('No response from Gemini');
  } catch (error) {
    console.error('LLM generation failed:', error);
    throw new Error('Failed to generate response');
  }
}

/**
 * Generate a RAG response with context
 */
export async function generateRAGResponse(
  query: string,
  contexts: Array<{ content: string; page?: number; docId: string; score: number }>,
  options: GenerateOptions = {}
): Promise<{ answer: string; tokenCount: number }> {
  // Build context string
  const contextText = contexts
    .map((ctx, i) => {
      const pageInfo = ctx.page ? ` (Page ${ctx.page})` : '';
      return `[Source ${i + 1}]${pageInfo}:\n${ctx.content}`;
    })
    .join('\n\n');

  const systemPrompt = `You are a helpful document assistant that answers questions based solely on the provided context. 

Instructions:
1. Only use information from the provided sources to answer questions
2. If the answer is not in the sources, clearly state that you cannot find the information
3. Cite sources using [Source N] format when using information from them
4. Be concise but comprehensive
5. If sources conflict, mention the discrepancy
6. Never make up or hallucinate information`;

  const userPrompt = `Context from documents:
${contextText}

Question: ${query}

Please provide a clear, accurate answer based only on the sources above.`;

  const messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const { text, tokenCount } = await generateCompletion(messages, {
    ...options,
    temperature: 0.2, // Lower temperature for more factual responses
  });

  return { answer: text, tokenCount };
}

/**
 * Check if the response might contain hallucinations
 */
export function detectPotentialHallucination(
  answer: string,
  contexts: Array<{ content: string }>
): boolean {
  // Simple heuristic: check if answer contains specific claims not found in context
  const answerLower = answer.toLowerCase();
  const contextText = contexts.map((c) => c.content.toLowerCase()).join(' ');

  // Look for numerical claims in the answer
  const numbers = answer.match(/\d+(\.\d+)?(%|percent|million|billion|thousand)?/gi) || [];

  for (const num of numbers) {
    if (!contextText.includes(num.toLowerCase())) {
      return true; // Potential hallucination: number not in context
    }
  }

  // Check for strong assertions about things not mentioned in context
  const strongAssertions = ['always', 'never', 'exactly', 'precisely', 'definitely'];
  for (const assertion of strongAssertions) {
    if (answerLower.includes(assertion) && !contextText.includes(assertion)) {
      return true;
    }
  }

  return false;
}
