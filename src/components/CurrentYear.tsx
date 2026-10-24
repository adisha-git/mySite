import { cacheLife } from "next/cache";

/** Cached so the static page still rolls over to the new year without a redeploy. */
export async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}
