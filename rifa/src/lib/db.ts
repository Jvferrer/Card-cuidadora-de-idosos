import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

type Cache = {
  pool?: pg.Pool;
  local?: Promise<PGlite>;
};

const cache: Cache = (globalThis as { __rifaDb?: Cache }).__rifaDb ?? {};
(globalThis as { __rifaDb?: Cache }).__rifaDb = cache;

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (databaseUrl !== "") {
    cache.pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    return (await cache.pool.query(text, params)).rows as T[];
  }
  cache.local ??= startLocal().catch((error: unknown) => {
    cache.local = undefined;
    throw error;
  });
  return (await (await cache.local).query<T>(text, params)).rows;
}

async function startLocal(): Promise<PGlite> {
  const db = new PGlite();
  const files = (await readdir("migrations").catch(() => []))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await db.exec(await readFile(`migrations/${file}`, "utf8"));
  }
  return db;
}
