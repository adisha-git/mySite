import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb(url: string) {
  return drizzle({ client: neon(url), schema });
}

let db: ReturnType<typeof createDb> | null = null;

/** Created on first use, so importing this module never needs DATABASE_URL (e.g. at build time). */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return (db ??= createDb(url));
}
