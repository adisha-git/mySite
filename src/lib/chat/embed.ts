import { VoyageAIClient } from "voyageai";
import { chatConfig } from "./config";

const BATCH_SIZE = 64;

let client: VoyageAIClient | null = null;

function getClient() {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set");
  return (client ??= new VoyageAIClient({ apiKey }));
}

async function embed(input: string[], inputType: "query" | "document"): Promise<number[][]> {
  const { embedding: model, embeddingDimensions } = chatConfig.models;
  const res = await getClient().embed({
    input,
    model,
    inputType,
    outputDimension: embeddingDimensions,
  });
  const data = [...(res.data ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  if (data.length !== input.length) {
    throw new Error(`Voyage returned ${data.length} embeddings for ${input.length} inputs`);
  }
  return data.map(({ embedding }) => {
    if (embedding?.length !== embeddingDimensions) {
      throw new Error(`Voyage returned an embedding with ${embedding?.length ?? 0} dimensions`);
    }
    return embedding;
  });
}

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    out.push(...(await embed(texts.slice(i, i + BATCH_SIZE), "document")));
  }
  return out;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embed([text], "query");
  return embedding;
}
