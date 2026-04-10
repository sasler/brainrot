type RedisModule = typeof import("redis");
type NodeRedisClient = ReturnType<RedisModule["createClient"]>;

export interface RatingsStorageState {
  available: boolean;
  writable: boolean;
  reason: string | null;
  missingEnvVars: string[];
}

interface RatingsRedisClient {
  get(key: string): Promise<number | null>;
  set(key: string, value: number): Promise<void>;
  hincrby(key: string, field: string, value: number): Promise<number>;
  hgetall<T extends Record<string, unknown>>(key: string): Promise<T | null>;
  getMany(keys: string[]): Promise<Array<number | null>>;
  hgetallMany<T extends Record<string, unknown>>(
    keys: string[],
  ): Promise<Array<T | null>>;
}

function getReadToken() {
  return process.env.KV_REST_API_TOKEN ?? process.env.KV_REST_API_READ_ONLY_TOKEN;
}

function normalizeValue(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;

  const parsed = Number(value);
  return Number.isNaN(parsed) ? value : parsed;
}

function normalizeHash<T extends Record<string, unknown>>(
  data: Record<string, number | string> | null | undefined,
): T | null {
  if (!data || Object.keys(data).length === 0) return null;

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    normalized[key] = normalizeValue(value);
  }

  return normalized as T;
}

function hasRedisUrl() {
  return !!process.env.REDIS_URL;
}

function getRedisUrlStorageState(): RatingsStorageState {
  return {
    available: true,
    writable: true,
    reason: null,
    missingEnvVars: [],
  };
}

function getKvRestStorageState(): RatingsStorageState {
  const url = process.env.KV_REST_API_URL;
  const writeToken = process.env.KV_REST_API_TOKEN;
  const readToken = getReadToken();

  const missingEnvVars: string[] = [];
  if (!url) {
    missingEnvVars.push("KV_REST_API_URL");
  }
  if (!readToken) {
    missingEnvVars.push("KV_REST_API_TOKEN or KV_REST_API_READ_ONLY_TOKEN");
  }

  if (!url || !readToken) {
    return {
      available: false,
      writable: false,
      reason:
        "Ratings storage is unavailable because neither REDIS_URL nor Vercel KV REST credentials are configured for this deployment.",
      missingEnvVars,
    };
  }

  if (!writeToken) {
    return {
      available: true,
      writable: false,
      reason:
        "Ratings are visible, but submitting new votes is disabled because KV_REST_API_TOKEN is missing for this deployment.",
      missingEnvVars: ["KV_REST_API_TOKEN"],
    };
  }

  return {
    available: true,
    writable: true,
    reason: null,
    missingEnvVars: [],
  };
}

export function getRatingsStorageState(): RatingsStorageState {
  if (hasRedisUrl()) {
    return getRedisUrlStorageState();
  }

  return getKvRestStorageState();
}

const globalForRedis = globalThis as typeof globalThis & {
  ratingsRedisClient?: NodeRedisClient;
  ratingsRedisClientPromise?: Promise<NodeRedisClient>;
};

async function getNodeRedisClient() {
  if (!process.env.REDIS_URL) return null;

  if (globalForRedis.ratingsRedisClient?.isOpen) {
    return globalForRedis.ratingsRedisClient;
  }

  if (!globalForRedis.ratingsRedisClientPromise) {
    globalForRedis.ratingsRedisClientPromise = (async () => {
      const { createClient } = await import("redis");
      const client = createClient({ url: process.env.REDIS_URL });
      client.on("error", (error) => {
        console.error(
          "Ratings Redis error:",
          error instanceof Error ? error.message : String(error),
        );
      });
      await client.connect();
      globalForRedis.ratingsRedisClient = client;
      return client;
    })();
  }

  return globalForRedis.ratingsRedisClientPromise;
}

async function getRedisUrlClient(): Promise<RatingsRedisClient | null> {
  const client = await getNodeRedisClient();
  if (!client) return null;

  const get = async (key: string) => {
    const value = normalizeValue(await client.get(key));
    return typeof value === "number" ? value : null;
  };

  const set = async (key: string, value: number) => {
    await client.set(key, String(value));
  };

  const hincrby = async (key: string, field: string, value: number) =>
    client.hIncrBy(key, field, value);

  const hgetall = async <T extends Record<string, unknown>>(key: string) =>
    normalizeHash<T>(await client.hGetAll(key));

  return {
    get,
    set,
    hincrby,
    hgetall,
    getMany: async (keys: string[]) => Promise.all(keys.map((key) => get(key))),
    hgetallMany: async <T extends Record<string, unknown>>(keys: string[]) =>
      Promise.all(keys.map((key) => hgetall<T>(key))),
  };
}

async function getKvRestClient(mode: "read" | "write"): Promise<RatingsRedisClient | null> {
  const storage = getKvRestStorageState();
  if (!storage.available || (mode === "write" && !storage.writable)) {
    return null;
  }

  const { Redis } = await import("@upstash/redis");
  const client = new Redis({
    url: process.env.KV_REST_API_URL!,
    token:
      mode === "write"
        ? process.env.KV_REST_API_TOKEN!
        : (process.env.KV_REST_API_TOKEN ??
            process.env.KV_REST_API_READ_ONLY_TOKEN)!,
  });

  const get = async (key: string) => {
    const value = normalizeValue(await client.get(key));
    return typeof value === "number" ? value : null;
  };

  const set = async (key: string, value: number) => {
    await client.set(key, value);
  };

  const hincrby = async (key: string, field: string, value: number) =>
    client.hincrby(key, field, value);

  const hgetall = async <T extends Record<string, unknown>>(key: string) =>
    normalizeHash<T>(
      ((await client.hgetall(key)) as Record<string, number | string> | null) ??
        null,
    );

  return {
    get,
    set,
    hincrby,
    hgetall,
    getMany: async (keys: string[]) => {
      const pipeline = client.pipeline();
      for (const key of keys) {
        pipeline.get(key);
      }
      const results = await pipeline.exec();
      return results.map((value) => {
        const normalized = normalizeValue(
          value as number | string | null | undefined,
        );
        return typeof normalized === "number" ? normalized : null;
      });
    },
    hgetallMany: async <T extends Record<string, unknown>>(keys: string[]) => {
      const pipeline = client.pipeline();
      for (const key of keys) {
        pipeline.hgetall(key);
      }
      const results = await pipeline.exec();
      return results.map((value) =>
        normalizeHash<T>(
          value as Record<string, number | string> | null | undefined,
        ),
      );
    },
  };
}

export async function getRatingsRedisClient(mode: "read" | "write") {
  if (hasRedisUrl()) {
    return getRedisUrlClient();
  }

  return getKvRestClient(mode);
}
