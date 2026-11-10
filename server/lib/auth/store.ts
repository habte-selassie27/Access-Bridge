import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export type AuthErrorCode = "NAME_TAKEN" | "INVALID" | "STORE_UNAVAILABLE";

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly status: number;

  constructor(message: string, code: AuthErrorCode, status = 400) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = status;
  }
}

export interface PublicUser {
  id: string;
  name: string;
  createdAt: number;
}

interface StoredUser extends PublicUser {
  nameKey: string;
  salt: string;
  hash: string;
}

interface StoredSession {
  tokenHash: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

interface AuthData {
  version: 1;
  users: StoredUser[];
  sessions: StoredSession[];
}

const EMPTY: AuthData = { version: 1, users: [], sessions: [] };

function publicUser(user: StoredUser): PublicUser {
  return { id: user.id, name: user.name, createdAt: user.createdAt };
}

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** scrypt is deliberately slow: a stolen file should not yield passwords. */
async function derive(password: string, salt: string): Promise<string> {
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return key.toString("hex");
}

function equalHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * A small server-side account store.
 *
 * Accounts and sessions live on the server, never in the browser. The default
 * path is a JSON file so a single Node instance (Render/Railway/Fly, or local
 * development) needs no database. Set AUTH_STORE_PATH to a path on persistent
 * storage in production; on an ephemeral filesystem, accounts do not survive a
 * redeploy. Swap this class for a database adapter without changing the routes.
 */
export class AuthStore {
  private data: AuthData | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly file: string;
  private readonly sessionDays: number;

  constructor(
    file = process.env.AUTH_STORE_PATH || path.join(process.cwd(), "data", "auth", "users.json"),
    sessionDays = Number(process.env.AUTH_SESSION_DAYS || 30)
  ) {
    this.file = file;
    this.sessionDays = sessionDays;
  }

  private async load(): Promise<AuthData> {
    if (this.data) return this.data;
    try {
      const raw = await fs.readFile(this.file, "utf8");
      const parsed = JSON.parse(raw) as AuthData;
      this.data = {
        version: 1,
        users: Array.isArray(parsed.users) ? parsed.users : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw new AuthError("The account store could not be read.", "STORE_UNAVAILABLE", 503);
      }
      this.data = { ...EMPTY, users: [], sessions: [] };
    }
    await this.pruneSessions(this.data);
    return this.data;
  }

  private async pruneSessions(data: AuthData): Promise<void> {
    const now = Date.now();
    const before = data.sessions.length;
    data.sessions = data.sessions.filter((session) => session.expiresAt > now);
    if (data.sessions.length !== before) await this.persist(data);
  }

  private async persist(data: AuthData): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const temp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
      await fs.writeFile(temp, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
      await fs.rename(temp, this.file);
    } catch {
      throw new AuthError("Accounts are not available on this deployment.", "STORE_UNAVAILABLE", 503);
    }
  }

  /** Serialise writes so two simultaneous sign-ups cannot overwrite each other. */
  private run<T>(fn: (data: AuthData) => Promise<T>): Promise<T> {
    const next = this.queue.then(async () => {
      const data = await this.load();
      return fn(data);
    });
    this.queue = next.catch(() => undefined);
    return next;
  }

  async createUser(name: string, password: string): Promise<PublicUser> {
    return this.run(async (data) => {
      const key = nameKey(name);
      if (data.users.some((user) => user.nameKey === key)) {
        throw new AuthError("That name is already taken.", "NAME_TAKEN", 409);
      }
      const salt = randomBytes(16).toString("hex");
      const hash = await derive(password, salt);
      const user: StoredUser = {
        id: `usr_${randomBytes(8).toString("hex")}`,
        name: name.trim(),
        nameKey: key,
        createdAt: Date.now(),
        salt,
        hash,
      };
      data.users.push(user);
      await this.persist(data);
      return publicUser(user);
    });
  }

  async verifyUser(name: string, password: string): Promise<PublicUser | null> {
    const data = await this.load();
    const user = data.users.find((candidate) => candidate.nameKey === nameKey(name));
    if (!user) return null;
    const hash = await derive(password, user.salt);
    return equalHex(hash, user.hash) ? publicUser(user) : null;
  }

  async createSession(userId: string): Promise<{ token: string; expiresAt: number }> {
    return this.run(async (data) => {
      const token = randomBytes(32).toString("base64url");
      const now = Date.now();
      const expiresAt = now + Math.max(1, this.sessionDays) * 24 * 60 * 60 * 1000;
      data.sessions.push({
        tokenHash: hashSessionToken(token),
        userId,
        createdAt: now,
        expiresAt,
      });
      await this.persist(data);
      return { token, expiresAt };
    });
  }

  async userForToken(token: string): Promise<PublicUser | null> {
    if (!token) return null;
    const data = await this.load();
    const tokenHash = hashSessionToken(token);
    const session = data.sessions.find((candidate) => candidate.tokenHash === tokenHash);
    if (!session || session.expiresAt <= Date.now()) return null;
    const user = data.users.find((candidate) => candidate.id === session.userId);
    return user ? publicUser(user) : null;
  }

  async deleteSession(token: string): Promise<void> {
    if (!token) return;
    await this.run(async (data) => {
      const tokenHash = hashSessionToken(token);
      const before = data.sessions.length;
      data.sessions = data.sessions.filter((session) => session.tokenHash !== tokenHash);
      if (data.sessions.length !== before) await this.persist(data);
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.run(async (data) => {
      data.users = data.users.filter((user) => user.id !== userId);
      data.sessions = data.sessions.filter((session) => session.userId !== userId);
      await this.persist(data);
    });
  }
}

export const authStore = new AuthStore();
