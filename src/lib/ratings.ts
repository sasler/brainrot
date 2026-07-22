import type { RatingsStorageState } from "./ratings-types";

export type { RatingsStorageState } from "./ratings-types";

type RedisModule = typeof import("redis");
type NodeRedisClient = ReturnType<RedisModule["createClient"]>;

interface RatingsRedisClient {
  hgetall<T extends Record<string, unknown>>(key: string): Promise<T | null>;
  getMany(keys: string[]): Promise<Array<number | string | null>>;
  hgetallMany<T extends Record<string, unknown>>(
    keys: string[],
  ): Promise<Array<T | null>>;
  applyVerdict(
    voteKey: string,
    ratingKey: string,
    encodedVerdict: string,
  ): Promise<Record<string, unknown> | null>;
}

const APPLY_VERDICT_SCRIPT = `
local voteKey = KEYS[1]
local ratingKey = KEYS[2]
local nextVerdict = ARGV[1]

local function validCategory(category)
  return category == 'wont-load'
    or category == 'wont-start'
    or category == 'controls-broken'
    or category == 'crash-freeze'
    or category == 'game-breaking-bug'
    or category == 'other'
end

local function parseVerdict(value)
  if not value then return 'none', 0, '' end
  local stars = tonumber(value)
  if stars and stars >= 1 and stars <= 5 and stars == math.floor(stars) then
    return 'rating', stars, ''
  end
  if value == 'fail' then return 'fail', 0, '' end
  local category = string.match(value, '^fail:(.+)$')
  if category and validCategory(category) then return 'fail', 0, category end
  return 'none', 0, ''
end

local function decrementIfPositive(field, amount)
  local current = tonumber(redis.call('HGET', ratingKey, field) or '0')
  if current > 0 then
    local decrement = math.min(current, amount)
    redis.call('HINCRBY', ratingKey, field, -decrement)
  end
end

local previous = redis.call('GET', voteKey)
local previousType, previousStars, previousCategory = parseVerdict(previous)
if previousType == 'rating' then
  decrementIfPositive('voteCount', 1)
  local totalStars = tonumber(redis.call('HGET', ratingKey, 'totalStars') or '0')
  redis.call('HSET', ratingKey, 'totalStars', math.max(0, totalStars - previousStars))
elseif previousType == 'fail' then
  decrementIfPositive('failCount', 1)
  if previousCategory ~= '' then
    decrementIfPositive('failCategory:' .. previousCategory, 1)
  end
end

local nextType, nextStars, nextCategory = parseVerdict(nextVerdict)
if nextType == 'rating' then
  redis.call('HINCRBY', ratingKey, 'totalStars', nextStars)
  redis.call('HINCRBY', ratingKey, 'voteCount', 1)
elseif nextType == 'fail' then
  redis.call('HINCRBY', ratingKey, 'failCount', 1)
  if nextCategory ~= '' then
    redis.call('HINCRBY', ratingKey, 'failCategory:' .. nextCategory, 1)
  end
else
  return redis.error_reply('Invalid verdict')
end

redis.call('SET', voteKey, nextVerdict)
return redis.call('HGETALL', ratingKey)
`;

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
  data: unknown,
): T | null {
  if (!data) return null;

  const entries =
    data instanceof Map
      ? Array.from(data.entries())
      : typeof data === "object"
        ? Object.entries(data as Record<string, unknown>)
        : [];
  if (entries.length === 0) return null;

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    normalized[key] = normalizeValue(
      value as number | string | null | undefined,
    );
  }

  return normalized as T;
}

function normalizeScriptHash(data: unknown): Record<string, unknown> | null {
  if (!Array.isArray(data) || data.length === 0) return normalizeHash(data);

  const hash: Record<string, unknown> = {};
  for (let index = 0; index < data.length; index += 2) {
    const key = data[index];
    if (typeof key !== "string") continue;
    hash[key] = normalizeValue(
      data[index + 1] as number | string | null | undefined,
    );
  }
  return Object.keys(hash).length > 0 ? hash : null;
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

export function withRatingsStorageFailure(
  storage: RatingsStorageState,
  reason: string,
): RatingsStorageState {
  if (!storage.available || !storage.writable || storage.reason) {
    return {
      ...storage,
      reason: storage.reason ?? reason,
    };
  }

  return {
    ...storage,
    available: false,
    writable: false,
    reason,
  };
}

const globalForRedis = globalThis as typeof globalThis & {
  ratingsRedisClient?: NodeRedisClient;
  ratingsRedisClientPromise?: Promise<NodeRedisClient | null>;
};

async function getNodeRedisClient() {
  if (!process.env.REDIS_URL) return null;

  if (globalForRedis.ratingsRedisClient?.isOpen) {
    return globalForRedis.ratingsRedisClient;
  }

  if (!globalForRedis.ratingsRedisClientPromise) {
    globalForRedis.ratingsRedisClientPromise = (async () => {
      try {
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
      } catch (error) {
        globalForRedis.ratingsRedisClient = undefined;
        globalForRedis.ratingsRedisClientPromise = undefined;
        console.error(
          "Failed to connect ratings Redis:",
          error instanceof Error ? error.message : String(error),
        );
        return null;
      }
    })();
  }

  return globalForRedis.ratingsRedisClientPromise;
}

async function getRedisUrlClient(): Promise<RatingsRedisClient | null> {
  const client = await getNodeRedisClient();
  if (!client) return null;

  const hgetall = async <T extends Record<string, unknown>>(key: string) =>
    normalizeHash<T>(await client.hGetAll(key));

  return {
    hgetall,
    getMany: async (keys: string[]) => {
      const values = await client.mGet(keys);
      return values.map((value) => normalizeValue(value));
    },
    hgetallMany: async <T extends Record<string, unknown>>(keys: string[]) => {
      const pipeline = client.multi();
      for (const key of keys) {
        pipeline.hGetAll(key);
      }
      const results = (await pipeline.exec()) ?? [];
      return results.map((value) => normalizeHash<T>(value));
    },
    applyVerdict: async (
      voteKey: string,
      ratingKey: string,
      encodedVerdict: string,
    ) =>
      normalizeScriptHash(
        await client.eval(APPLY_VERDICT_SCRIPT, {
          keys: [voteKey, ratingKey],
          arguments: [encodedVerdict],
        }),
      ),
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

  const hgetall = async <T extends Record<string, unknown>>(key: string) =>
    normalizeHash<T>(
      ((await client.hgetall(key)) as Record<string, number | string> | null) ??
        null,
    );

  return {
    hgetall,
    getMany: async (keys: string[]) => {
      const pipeline = client.pipeline();
      for (const key of keys) {
        pipeline.get(key);
      }
      const results = await pipeline.exec();
      return results.map((value) =>
        normalizeValue(value as number | string | null | undefined),
      );
    },
    hgetallMany: async <T extends Record<string, unknown>>(keys: string[]) => {
      const pipeline = client.pipeline();
      for (const key of keys) {
        pipeline.hgetall(key);
      }
      const results = await pipeline.exec();
      return results.map((value) => normalizeHash<T>(value));
    },
    applyVerdict: async (
      voteKey: string,
      ratingKey: string,
      encodedVerdict: string,
    ) =>
      normalizeScriptHash(
        await client.eval(APPLY_VERDICT_SCRIPT, [voteKey, ratingKey], [
          encodedVerdict,
        ]),
      ),
  };
}

export async function getRatingsRedisClient(mode: "read" | "write") {
  if (hasRedisUrl()) {
    return getRedisUrlClient();
  }

  return getKvRestClient(mode);
}
