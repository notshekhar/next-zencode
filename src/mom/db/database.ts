import { Database as BunDatabase } from "bun:sqlite";
import * as fs from "fs";
import * as path from "path";
import type { Message } from "../shared/types";
import type { UIMessage } from "ai";
import { compactMessageParts } from "../services/messageCompaction";

// Wrapper to adapt bun:sqlite to our existing usage patterns
class Database extends BunDatabase {
    query<ReturnType, ParamsType extends any[]>(sql: string) {
        return super.query<ReturnType, ParamsType>(sql);
    }

    // bun:sqlite's prepare().run() returns { lastInsertRowid: number, changes: number }
    // better-sqlite3's prepare().run() returns { lastInsertRowid: bigint, changes: number }
    // We need to ensure compatibility, especially for existing code expecting the result object.
    run(sql: string, params?: any[]) {
        const stmt = super.prepare(sql);
        if (params && Array.isArray(params)) {
            return stmt.run(...params);
        }
        return stmt.run();
    }
}

// Get global .zencode directory path (in home directory)
function getZencodeDir(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || "~";
    const dir = path.join(homeDir, ".zencode");
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

// Get database path
function getDbPath(): string {
    return path.join(getZencodeDir(), "sessions.db");
}

// Initialize database
let db: Database | null = null;

export function getDb(): Database {
    if (!db) {
        db = new Database(getDbPath());
        initSchema();
    }
    return db;
}

function initSchema() {
    const database = getDb();

    database.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      cwd TEXT NOT NULL,
      revert TEXT
    )
  `);

    database.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ui_id TEXT,
      snapshot TEXT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      parts TEXT,
      is_error INTEGER DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    )
  `);

    // Migration: add revert column to sessions if it doesn't exist
    try {
        database.run(`ALTER TABLE sessions ADD COLUMN revert TEXT`);
    } catch {
        // Column already exists, ignore error
    }

    // Migration: add ui_id column to messages if it doesn't exist
    try {
        database.run(`ALTER TABLE messages ADD COLUMN ui_id TEXT`);
    } catch {
        // Column already exists, ignore error
    }
    // Migration: add snapshot column to messages if it doesn't exist
    try {
        database.run(`ALTER TABLE messages ADD COLUMN snapshot TEXT`);
    } catch {
        // Column already exists, ignore error
    }

    database.run(`
    CREATE INDEX IF NOT EXISTS idx_messages_session
    ON messages(session_id, timestamp)
  `);
}

// Session functions
export interface Session {
    id: string;
    name: string | null;
    created_at: number;
    updated_at: number;
    cwd: string;
    revert?: {
        messageID: string;
        snapshot: string; // Git commit hash
        diff?: string;
    } | null;
}

export function createSession(name?: string, id?: string): Session {
    const database = getDb();
    const sessionId = id || generateId();
    const now = Date.now();
    const cwd = process.cwd();

    database.run(
        `INSERT INTO sessions (id, name, created_at, updated_at, cwd, revert) VALUES (?, ?, ?, ?, ?, ?)`,
        [sessionId, name || null, now, now, cwd, null],
    );

    return {
        id: sessionId,
        name: name || null,
        created_at: now,
        updated_at: now,
        cwd,
        revert: null,
    };
}

export function getSession(id: string): Session | null {
    const database = getDb();
    const row = database
        .query(`SELECT * FROM sessions WHERE id = ?`)
        .get(id) as any;
    if (!row) return null;

    return {
        ...row,
        revert: row.revert ? JSON.parse(row.revert) : null,
    };
}

export function getAllSessions(limit?: number): Session[] {
    const database = getDb();
    const cwd = process.cwd();
    let query = `SELECT * FROM sessions WHERE cwd = ? ORDER BY updated_at DESC`;
    const params: any[] = [cwd];

    if (limit) {
        query += ` LIMIT ?`;
        params.push(limit);
    }

    const rows = database.query(query).all(...params) as Session[];
    return rows;
}

// Get all sessions across all projects (for debugging/admin purposes)
export function getAllSessionsGlobal(): Session[] {
    const database = getDb();
    const rows = database
        .query(`SELECT * FROM sessions ORDER BY updated_at DESC`)
        .all() as Session[];
    return rows;
}

export function searchSessions(query: string): Session[] {
    const database = getDb();
    const cwd = process.cwd();
    const rows = database
        .query(
            `SELECT * FROM sessions WHERE cwd = ? AND name LIKE ? ORDER BY updated_at DESC`,
        )
        .all(cwd, `%${query}%`) as Session[];
    return rows;
}

export function updateSessionTimestamp(id: string) {
    const database = getDb();
    database.run(`UPDATE sessions SET updated_at = ? WHERE id = ?`, [
        Date.now(),
        id,
    ]);
}

export function deleteSession(id: string) {
    const database = getDb();
    database.run(`DELETE FROM messages WHERE session_id = ?`, [id]);
    database.run(`DELETE FROM sessions WHERE id = ?`, [id]);
}

// Delete all sessions for the current project directory
export function deleteAllProjectSessions(): number {
    const database = getDb();
    const cwd = process.cwd();

    // First get all session IDs for this project
    const sessions = database
        .query(`SELECT id FROM sessions WHERE cwd = ?`)
        .all(cwd) as { id: string }[];

    // Delete messages for all these sessions
    for (const session of sessions) {
        database.run(`DELETE FROM messages WHERE session_id = ?`, [session.id]);
    }

    // Delete all sessions for this project
    const result = database.run(`DELETE FROM sessions WHERE cwd = ?`, [cwd]);
    return sessions.length;
}

// Delete all sessions globally (all projects)
export function deleteAllSessions(): number {
    const database = getDb();

    // Get count before deleting
    const sessions = database
        .query(`SELECT COUNT(*) as count FROM sessions`)
        .get() as { count: number };

    // Delete all messages and sessions
    database.run(`DELETE FROM messages`);
    database.run(`DELETE FROM sessions`);

    return sessions.count;
}

// Message functions
export interface DbMessage {
    id: number;
    ui_id?: string | null;
    snapshot?: string | null;
    session_id: string;
    role: string;
    content: string;
    timestamp: number;
    parts: string | null;
    is_error: number;
}

export function getSessionMessages(sessionId: string): Message[] {
    const database = getDb();
    const rows = database
        .query(
            `SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC`,
        )
        .all(sessionId) as DbMessage[];

    return rows.map((row) => ({
        role: row.role as "user" | "assistant" | "system",
        content: row.content,
        timestamp: row.timestamp,
        parts: row.parts ? JSON.parse(row.parts) : undefined,
        isError: row.is_error === 1,
    }));
}
const tempSessions = new Map<string, { id: string; name: string | null }>();

export function createTempSession(): string {
    const id = `temp-${generateId()}`;
    tempSessions.set(id, { id, name: null });
    return id;
}

export function isTempSession(sessionId: string): boolean {
    return sessionId.startsWith("temp-");
}

export function saveMessage(
    sessionId: string,
    message: Message,
): { messageId: number; sessionId: string } {
    const database = getDb();

    // Check if this is a temp session or non-existent session
    let actualSessionId = sessionId;
    let sessionName: string | null = null;

    if (isTempSession(sessionId)) {
        // Create a real session with a title from the first user message
        if (message.role === "user") {
            sessionName = generateSessionName(message.content);
        }

        const newSession = createSession(sessionName || undefined);
        actualSessionId = newSession.id;

        // Remove from temp sessions
        tempSessions.delete(sessionId);

        // Update the calling code's session reference would need to happen at App level
        // For now, we return the new session ID
    }

    const result = database.run(
        `INSERT INTO messages (session_id, role, content, timestamp, parts, is_error) VALUES (?, ?, ?, ?, ?, ?)`,
        [
            actualSessionId,
            message.role,
            message.content,
            message.timestamp,
            message.parts ? JSON.stringify(message.parts) : null,
            message.isError ? 1 : 0,
        ],
    );

    updateSessionTimestamp(actualSessionId);
    return {
        messageId: Number(result.lastInsertRowid),
        sessionId: actualSessionId,
    };
}

function generateSessionName(content: string): string {
    // Extract first 5-7 words from the message as the session name
    const words = content.split(/\s+/).filter((w) => w.length > 0);
    const nameWords = words.slice(0, 7);
    let name = nameWords.join(" ");

    // Truncate if too long
    if (name.length > 50) {
        name = name.slice(0, 47) + "...";
    }

    return name;
}

export function updateMessage(messageId: number, message: Message): void {
    const database = getDb();

    database.run(`UPDATE messages SET parts = ?, content = ? WHERE id = ?`, [
        message.parts ? JSON.stringify(message.parts) : null,
        message.content,
        messageId,
    ]);
}

export function getMessageTimeline(sessionId: string): Array<{
    id: number;
    role: string;
    content: string;
    timestamp: number;
    snapshot?: string | null;
}> {
    const database = getDb();
    const rows = database
        .query(
            `SELECT id, role, content, timestamp, snapshot FROM messages WHERE session_id = ? ORDER BY timestamp ASC`,
        )
        .all(sessionId) as Array<{
        id: number;
        role: string;
        content: string;
        timestamp: number;
        snapshot?: string | null;
    }>;
    return rows;
}

export function getMessageSnapshot(
    sessionId: string,
    messageId: number,
): string | null {
    const database = getDb();
    const row = database
        .query(`SELECT snapshot FROM messages WHERE session_id = ? AND id = ?`)
        .get(sessionId, messageId) as { snapshot?: string | null } | null;
    if (!row) return null;
    return row.snapshot ?? null;
}

// Delete messages from the specified message onwards (including the message itself)
export function deleteFromMessage(sessionId: string, messageId: number): void {
    const database = getDb();

    // Get the message to delete from
    const message = database
        .query(`SELECT timestamp FROM messages WHERE id = ?`)
        .get(messageId) as { timestamp: number } | null;
    if (!message) return;

    // Delete the selected message and all messages after it
    database.run(
        `DELETE FROM messages WHERE session_id = ? AND timestamp >= ?`,
        [sessionId, message.timestamp],
    );
}

// Legacy function - keep for compatibility but use deleteFromMessage instead
export function revertToMessage(sessionId: string, messageId: number) {
    const database = getDb();
    // Delete all messages after the specified message
    const message = database
        .query(`SELECT timestamp FROM messages WHERE id = ?`)
        .get(messageId) as { timestamp: number } | null;
    if (message) {
        database.run(
            `DELETE FROM messages WHERE session_id = ? AND timestamp > ?`,
            [sessionId, message.timestamp],
        );
    }
}

export function getMessagesUpTo(
    sessionId: string,
    messageId: number,
): Message[] {
    const database = getDb();
    const message = database
        .query(`SELECT timestamp FROM messages WHERE id = ?`)
        .get(messageId) as { timestamp: number } | null;

    if (!message) return [];

    const rows = database
        .query(
            `SELECT * FROM messages WHERE session_id = ? AND timestamp <= ? ORDER BY timestamp ASC`,
        )
        .all(sessionId, message.timestamp) as DbMessage[];

    return rows.map((row) => ({
        role: row.role as "user" | "assistant" | "system",
        content: row.content,
        timestamp: row.timestamp,
        parts: row.parts ? JSON.parse(row.parts) : undefined,
        isError: row.is_error === 1,
    }));
}

// Session Revert Management
export function updateSessionRevert(
    sessionId: string,
    revert: { messageID: string; snapshot: string; diff?: string } | undefined,
): void {
    const database = getDb();
    database.run(`UPDATE sessions SET revert = ? WHERE id = ?`, [
        revert ? JSON.stringify(revert) : null,
        sessionId,
    ]);
}

// UIMessage functions - save parts directly without conversion
export function saveUIMessage(
    sessionId: string,
    message: UIMessage,
    options?: { snapshot?: string },
): { messageId: number } {
    const database = getDb();

    // Check if session exists, if not create it with the SAME ID
    const existingSession = getSession(sessionId);
    if (!existingSession) {
        const textContent = message.parts
            .filter(
                (p): p is { type: "text"; text: string } => p.type === "text",
            )
            .map((p) => p.text)
            .join("");

        // Generate title from first user message
        const sessionName =
            message.role === "user" ? generateSessionName(textContent) : null;
        createSession(sessionName || undefined, sessionId);
    }

    const compactParts = compactMessageParts(message.parts);

    const textContent = compactParts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");

    const result = database.run(
        `INSERT INTO messages (ui_id, snapshot, session_id, role, content, timestamp, parts, is_error) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            message.id ?? null,
            options?.snapshot ?? null,
            sessionId,
            message.role,
            textContent,
            Date.now(),
            JSON.stringify(compactParts),
            0,
        ],
    );

    updateSessionTimestamp(sessionId);
    return { messageId: Number(result.lastInsertRowid) };
}

export function getUIMessages(sessionId: string): UIMessage[] {
    const database = getDb();
    const rows = database
        .query(
            `SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC`,
        )
        .all(sessionId) as DbMessage[];

    return rows.map((row, idx) => ({
        id: row.ui_id || `${sessionId}-${row.id}`,
        role: row.role as "user" | "assistant",
        parts: row.parts
            ? JSON.parse(row.parts)
            : [{ type: "text", text: row.content }],
    }));
}

// Update an existing UIMessage (used for approval flow)
export function updateUIMessage(
    sessionId: string,
    messageId: string,
    message: UIMessage,
): void {
    const database = getDb();
    if (!messageId) {
        return;
    }

    const compactParts = compactMessageParts(message.parts);

    const byUiId = database
        .query(
            `UPDATE messages SET parts = ? WHERE session_id = ? AND ui_id = ?`,
        )
        .run(JSON.stringify(compactParts), sessionId, messageId);

    if (byUiId.changes && byUiId.changes > 0) {
        return;
    }

    const idPart = messageId.split("-").pop();
    const numericId = idPart ? Number(idPart) : NaN;
    if (!Number.isFinite(numericId)) {
        return;
    }

    database
        .query(`UPDATE messages SET parts = ? WHERE session_id = ? AND id = ?`)
        .run(JSON.stringify(compactParts), sessionId, numericId);
}

// Helper
function generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}
