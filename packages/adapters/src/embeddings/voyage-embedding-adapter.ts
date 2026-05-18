import { Result, ok, err } from 'neverthrow';
import { EmbeddingClientError, type IEmbeddingClient } from '@pledgeoff/core';

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
const MODEL = 'voyage-3-lite'; // 512 dims, 200M tokens/mo free

export class VoyageEmbeddingAdapter implements IEmbeddingClient {
  constructor(private readonly apiKey: string) {}

  async embed(text: string): Promise<Result<number[], EmbeddingClientError>> {
    try {
      const response = await fetch(VOYAGE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ input: [text], model: MODEL }),
      });

      if (!response.ok) {
        const body = await response.text();
        return err(new EmbeddingClientError(`Voyage API error ${response.status}: ${body}`));
      }

      const json = (await response.json()) as { data: Array<{ embedding: number[] }> };
      const embedding = json.data[0]?.embedding;

      if (!embedding?.length) {
        return err(new EmbeddingClientError('Voyage returned empty embedding'));
      }

      return ok(embedding);
    } catch (e) {
      return err(new EmbeddingClientError(e instanceof Error ? e.message : String(e)));
    }
  }
}
