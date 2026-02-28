import * as path from "path";
import * as fs from "fs";

const LOCAL_EMBEDDING_MODEL_ID =
    process.env.LOCAL_EMBEDDING_MODEL_ID || "nomic-ai/nomic-embed-text-v1.5";
export const EMBEDDING_DIMENSIONS = 768;

function getZencodeDir(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
    const dir = path.join(homeDir, ".zencode");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

function getModelCacheDir(): string {
    const dir =
        process.env.LOCAL_EMBEDDING_CACHE_DIR ||
        path.join(getZencodeDir(), "models");
    fs.mkdirSync(dir, { recursive: true });
    return dir;
}

// Survive Next.js HMR in dev mode — store pipeline on globalThis
// so hot reloads don't re-download the ~500 MB model.
const globalState = globalThis as unknown as {
    __zencode_embeddingPipeline?: Promise<any> | null;
    __zencode_embeddingUnavailable?: string | null;
};

function getEmbeddingPipeline() {
    if (globalState.__zencode_embeddingUnavailable) {
        return Promise.reject(
            new Error(globalState.__zencode_embeddingUnavailable),
        );
    }

    if (!globalState.__zencode_embeddingPipeline) {
        globalState.__zencode_embeddingPipeline = (async () => {
            try {
                const { env, pipeline } = await import(
                    "@huggingface/transformers"
                );

                env.cacheDir = getModelCacheDir();
                env.allowLocalModels = true;
                env.allowRemoteModels =
                    process.env.LOCAL_EMBEDDING_ALLOW_REMOTE !== "false";

                console.log(
                    `  [zencode] Loading embedding model (cache: ${env.cacheDir})`,
                );

                return await pipeline(
                    "feature-extraction",
                    LOCAL_EMBEDDING_MODEL_ID,
                );
            } catch (err: any) {
                const msg = String(err?.message || err);

                if (
                    msg.includes("onnxruntime") ||
                    msg.includes("Cannot find module") ||
                    msg.includes("not enough arguments")
                ) {
                    globalState.__zencode_embeddingUnavailable =
                        "Embeddings unavailable: onnxruntime-node is not installed. " +
                        "Run: bun add @huggingface/transformers onnxruntime-node";
                } else {
                    globalState.__zencode_embeddingUnavailable = `Embeddings initialization failed: ${msg}`;
                }

                console.warn(
                    `\n  [zencode] ${globalState.__zencode_embeddingUnavailable}\n`,
                );
                globalState.__zencode_embeddingPipeline = null;
                throw new Error(globalState.__zencode_embeddingUnavailable);
            }
        })();
    }

    return globalState.__zencode_embeddingPipeline;
}

function fitDimensions(values: number[]): number[] {
    if (values.length === EMBEDDING_DIMENSIONS) return values;
    if (values.length > EMBEDDING_DIMENSIONS)
        return values.slice(0, EMBEDDING_DIMENSIONS);
    return values.concat(
        new Array(EMBEDDING_DIMENSIONS - values.length).fill(0),
    );
}

async function runLocalEmbedding(text: string): Promise<number[]> {
    const extractor = await getEmbeddingPipeline();
    const output = await extractor(text, {
        pooling: "mean",
        normalize: true,
    });

    const vector = Array.from(output.data as Float32Array).map(Number);
    return fitDimensions(vector);
}

export async function generateEmbedding(text: string): Promise<number[]> {
    return runLocalEmbedding(text);
}

export async function generateEmbeddings(
    texts: string[],
): Promise<number[][]> {
    if (texts.length === 0) return [];
    return Promise.all(texts.map(runLocalEmbedding));
}

export function getEmbeddingUnavailableReason(): string | null {
    return globalState.__zencode_embeddingUnavailable ?? null;
}

export function serializeVector(embedding: number[]): Buffer {
    const f32 = new Float32Array(embedding);
    return Buffer.from(f32.buffer);
}

export function deserializeVector(buffer: Buffer | Uint8Array): number[] {
    const f32 = new Float32Array(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength / 4,
    );
    return Array.from(f32);
}
