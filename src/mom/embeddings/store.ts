import { Database } from "bun:sqlite";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// sqlite-vec extension loading
// ---------------------------------------------------------------------------

let vecAvailable = false;

// macOS ships a SQLite build that disables extension loading.
// Point Bun at Homebrew's sqlite3 if available.
if (process.platform === "darwin") {
    const brewPaths = [
        "/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib",
        "/usr/local/opt/sqlite3/lib/libsqlite3.dylib",
        "/opt/homebrew/opt/sqlite3/lib/libsqlite3.dylib",
    ];
    for (const p of brewPaths) {
        try {
            if (fs.existsSync(p)) {
                Database.setCustomSQLite(p);
                break;
            }
        } catch {
            // already set or not supported — continue
        }
    }
}

function tryLoadVec(database: Database): boolean {
    try {
        const sqliteVec = require("sqlite-vec");
        sqliteVec.load(database);
        return true;
    } catch {
        console.warn(
            "  [zencode] sqlite-vec not available — falling back to JS brute-force search",
        );
        return false;
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function serializeVector(embedding: number[]): Buffer {
    const f32 = new Float32Array(embedding);
    return Buffer.from(f32.buffer);
}

function toVecBlob(embedding: number[]): Float32Array {
    return new Float32Array(embedding);
}

function deserializeVector(buffer: Buffer | Uint8Array): number[] {
    const f32 = new Float32Array(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength / 4,
    );
    return Array.from(f32);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoredChunk {
    id: number;
    projectPath: string;
    filePath: string;
    startLine: number;
    endLine: number;
    content: string;
    language: string;
    embedding: Buffer;
    fileHash: string;
    createdAt: number;
}

export interface SearchResult {
    id: number;
    filePath: string;
    startLine: number;
    endLine: number;
    content: string;
    language: string;
    similarity: number;
}

export interface EmbeddingStats {
    totalChunks: number;
    totalFiles: number;
    lastIndexedAt: number | null;
    fileList: Array<{ filePath: string; chunkCount: number }>;
}

// ---------------------------------------------------------------------------
// Database init
// ---------------------------------------------------------------------------

function getDbPath(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
    const dir = path.join(homeDir, ".zencode");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, "embeddings.db");
}

let db: Database | null = null;

function getDb(): Database {
    if (!db) {
        db = new Database(getDbPath());
        vecAvailable = tryLoadVec(db);
        initSchema();
    }
    return db;
}

function initSchema() {
    const database = getDb();

    database.run(`
        CREATE TABLE IF NOT EXISTS embeddings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_path TEXT NOT NULL,
            file_path TEXT NOT NULL,
            start_line INTEGER NOT NULL,
            end_line INTEGER NOT NULL,
            content TEXT NOT NULL,
            language TEXT NOT NULL,
            embedding BLOB NOT NULL,
            file_hash TEXT NOT NULL,
            created_at INTEGER NOT NULL
        )
    `);

    database.run(`
        CREATE INDEX IF NOT EXISTS idx_embeddings_project
        ON embeddings(project_path)
    `);

    database.run(`
        CREATE INDEX IF NOT EXISTS idx_embeddings_project_file
        ON embeddings(project_path, file_path)
    `);

    database.run(`
        CREATE TABLE IF NOT EXISTS file_hashes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_path TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_hash TEXT NOT NULL,
            UNIQUE(project_path, file_path)
        )
    `);

    // vec0 virtual table for native KNN search
    if (vecAvailable) {
        database.run(`
            CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(
                chunk_id INTEGER PRIMARY KEY,
                project_path TEXT partition key,
                embedding float[768]
            )
        `);

        // Backfill: if embeddings exist but vec_chunks is empty, populate it
        migrateVecChunks(database);
    }
}

/**
 * One-time migration: copy embeddings into vec_chunks for users
 * who indexed before sqlite-vec was added.
 */
function migrateVecChunks(database: Database) {
    const vecCount = database
        .query(`SELECT COUNT(*) as cnt FROM vec_chunks`)
        .get() as { cnt: number };

    const embCount = database
        .query(`SELECT COUNT(*) as cnt FROM embeddings`)
        .get() as { cnt: number };

    if (vecCount.cnt > 0 || embCount.cnt === 0) return;

    console.log(
        `  [zencode] Backfilling vec_chunks from ${embCount.cnt} existing embeddings...`,
    );

    const rows = database
        .query(`SELECT id, project_path, embedding FROM embeddings`)
        .all() as Array<{
        id: number;
        project_path: string;
        embedding: Buffer;
    }>;

    const insert = database.prepare(
        `INSERT INTO vec_chunks (chunk_id, project_path, embedding) VALUES (?, ?, ?)`,
    );

    const txn = database.transaction(() => {
        for (const row of rows) {
            insert.run(row.id, row.project_path, row.embedding);
        }
    });

    txn();
    console.log(`  [zencode] Backfilled ${rows.length} vectors into vec_chunks`);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export function insertChunks(
    projectPath: string,
    chunks: Array<{
        filePath: string;
        startLine: number;
        endLine: number;
        content: string;
        language: string;
        embedding: number[];
    }>,
): void {
    const database = getDb();
    const now = Date.now();

    const insertEmb = database.prepare(
        `INSERT INTO embeddings (project_path, file_path, start_line, end_line, content, language, embedding, file_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const insertVec = vecAvailable
        ? database.prepare(
              `INSERT INTO vec_chunks (chunk_id, project_path, embedding) VALUES (?, ?, ?)`,
          )
        : null;

    const txn = database.transaction(() => {
        for (const chunk of chunks) {
            const blob = serializeVector(chunk.embedding);

            const result = insertEmb.run(
                projectPath,
                chunk.filePath,
                chunk.startLine,
                chunk.endLine,
                chunk.content,
                chunk.language,
                blob,
                "",
                now,
            );

            if (insertVec) {
                const rowId = Number(result.lastInsertRowid);
                insertVec.run(rowId, projectPath, blob);
            }
        }
    });

    txn();
}

export function upsertFileHash(
    projectPath: string,
    filePath: string,
    fileHash: string,
): void {
    const database = getDb();
    database.run(
        `INSERT INTO file_hashes (project_path, file_path, file_hash)
         VALUES (?, ?, ?)
         ON CONFLICT(project_path, file_path) DO UPDATE SET file_hash = ?`,
        [projectPath, filePath, fileHash, fileHash],
    );
}

export function getFileHash(
    projectPath: string,
    filePath: string,
): string | null {
    const database = getDb();
    const row = database
        .query(
            `SELECT file_hash FROM file_hashes WHERE project_path = ? AND file_path = ?`,
        )
        .get(projectPath, filePath) as { file_hash: string } | null;
    return row?.file_hash ?? null;
}

export function deleteFileChunks(
    projectPath: string,
    filePath: string,
): void {
    const database = getDb();

    // Delete from vec_chunks first (needs the ids from embeddings)
    if (vecAvailable) {
        database.run(
            `DELETE FROM vec_chunks WHERE chunk_id IN (
                SELECT id FROM embeddings WHERE project_path = ? AND file_path = ?
            )`,
            [projectPath, filePath],
        );
    }

    database.run(
        `DELETE FROM embeddings WHERE project_path = ? AND file_path = ?`,
        [projectPath, filePath],
    );
}

export function deleteFileHash(
    projectPath: string,
    filePath: string,
): void {
    const database = getDb();
    database.run(
        `DELETE FROM file_hashes WHERE project_path = ? AND file_path = ?`,
        [projectPath, filePath],
    );
}

export function clearProjectEmbeddings(projectPath: string): void {
    const database = getDb();

    if (vecAvailable) {
        database.run(`DELETE FROM vec_chunks WHERE project_path = ?`, [
            projectPath,
        ]);
    }

    database.run(`DELETE FROM embeddings WHERE project_path = ?`, [
        projectPath,
    ]);
    database.run(`DELETE FROM file_hashes WHERE project_path = ?`, [
        projectPath,
    ]);
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function getStats(projectPath: string): EmbeddingStats {
    const database = getDb();

    const countRow = database
        .query(
            `SELECT COUNT(*) as cnt FROM embeddings WHERE project_path = ?`,
        )
        .get(projectPath) as { cnt: number };

    const filesRows = database
        .query(
            `SELECT file_path, COUNT(*) as chunk_count
             FROM embeddings WHERE project_path = ?
             GROUP BY file_path ORDER BY file_path`,
        )
        .all(projectPath) as Array<{
        file_path: string;
        chunk_count: number;
    }>;

    const lastRow = database
        .query(
            `SELECT MAX(created_at) as last_ts FROM embeddings WHERE project_path = ?`,
        )
        .get(projectPath) as { last_ts: number | null };

    return {
        totalChunks: countRow.cnt,
        totalFiles: filesRows.length,
        lastIndexedAt: lastRow.last_ts,
        fileList: filesRows.map((r) => ({
            filePath: r.file_path,
            chunkCount: r.chunk_count,
        })),
    };
}

export function getChunks(
    projectPath: string,
    limit: number = 50,
    offset: number = 0,
): {
    items: Array<{
        id: number;
        filePath: string;
        startLine: number;
        endLine: number;
        content: string;
        language: string;
        createdAt: number;
    }>;
    total: number;
} {
    const database = getDb();

    const countRow = database
        .query(
            `SELECT COUNT(*) as cnt FROM embeddings WHERE project_path = ?`,
        )
        .get(projectPath) as { cnt: number };

    const rows = database
        .query(
            `SELECT id, file_path, start_line, end_line, content, language, created_at
             FROM embeddings WHERE project_path = ?
             ORDER BY file_path, start_line
             LIMIT ? OFFSET ?`,
        )
        .all(projectPath, limit, offset) as Array<{
        id: number;
        file_path: string;
        start_line: number;
        end_line: number;
        content: string;
        language: string;
        created_at: number;
    }>;

    return {
        items: rows.map((r) => ({
            id: r.id,
            filePath: r.file_path,
            startLine: r.start_line,
            endLine: r.end_line,
            content: r.content,
            language: r.language,
            createdAt: r.created_at,
        })),
        total: countRow.cnt,
    };
}

// ---------------------------------------------------------------------------
// Semantic search
// ---------------------------------------------------------------------------

export function semanticSearch(
    projectPath: string,
    queryVector: number[],
    limit: number = 20,
): SearchResult[] {
    if (vecAvailable) {
        return vecKnnSearch(projectPath, queryVector, limit);
    }
    return bruteForcSearch(projectPath, queryVector, limit);
}

/**
 * Native KNN via sqlite-vec vec0 virtual table.
 * sqlite-vec returns L2 (euclidean) distance; since our vectors are
 * normalized, distance = sqrt(2 - 2*cosine_sim).
 * We convert back: similarity = 1 - (distance^2 / 2).
 */
function vecKnnSearch(
    projectPath: string,
    queryVector: number[],
    limit: number,
): SearchResult[] {
    const database = getDb();
    const queryBlob = toVecBlob(queryVector);

    const rows = database
        .query(
            `SELECT
                e.id, e.file_path, e.start_line, e.end_line,
                e.content, e.language,
                v.distance
             FROM vec_chunks v
             JOIN embeddings e ON e.id = v.chunk_id
             WHERE v.project_path = ?
               AND v.embedding MATCH ?
               AND v.k = ?
             ORDER BY v.distance`,
        )
        .all(projectPath, queryBlob, limit) as Array<{
        id: number;
        file_path: string;
        start_line: number;
        end_line: number;
        content: string;
        language: string;
        distance: number;
    }>;

    return rows.map((r) => ({
        id: r.id,
        filePath: r.file_path,
        startLine: r.start_line,
        endLine: r.end_line,
        content: r.content,
        language: r.language,
        similarity: 1 - (r.distance * r.distance) / 2,
    }));
}

/** JS fallback when sqlite-vec is not available. */
function bruteForcSearch(
    projectPath: string,
    queryVector: number[],
    limit: number,
): SearchResult[] {
    const database = getDb();

    const rows = database
        .query(
            `SELECT id, file_path, start_line, end_line, content, language, embedding
             FROM embeddings WHERE project_path = ?`,
        )
        .all(projectPath) as Array<{
        id: number;
        file_path: string;
        start_line: number;
        end_line: number;
        content: string;
        language: string;
        embedding: Buffer;
    }>;

    const scored: SearchResult[] = [];

    for (const row of rows) {
        const storedVec = deserializeVector(row.embedding);
        const sim = dotProduct(queryVector, storedVec);
        scored.push({
            id: row.id,
            filePath: row.file_path,
            startLine: row.start_line,
            endLine: row.end_line,
            content: row.content,
            language: row.language,
            similarity: sim,
        });
    }

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, limit);
}

function dotProduct(a: number[], b: number[]): number {
    let sum = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}

/** Whether sqlite-vec is loaded and KNN is available. */
export function isVecAvailable(): boolean {
    getDb(); // ensure init
    return vecAvailable;
}
