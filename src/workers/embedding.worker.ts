/// <reference lib="webworker" />

import { pipeline } from "@huggingface/transformers";

type Request = { query: string; passages: string[] };

function cosine(a: number[], b: number[]) {
  let dot = 0, aa = 0, bb = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index]; aa += a[index] ** 2; bb += b[index] ** 2;
  }
  return dot / (Math.sqrt(aa) * Math.sqrt(bb));
}

self.onmessage = async ({ data }: MessageEvent<Request>) => {
  try {
    const embed = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", { dtype: "q8" });
    const output = await embed([data.query, ...data.passages], { pooling: "mean", normalize: true });
    const vectors = output.tolist() as number[][];
    self.postMessage({ scores: vectors.slice(1).map((vector) => cosine(vectors[0], vector)) });
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : "Embedding failed" });
  }
};

