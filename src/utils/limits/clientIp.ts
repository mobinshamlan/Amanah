import { headers } from "next/headers";
import { hashClientIp } from "@/utils/limits/usageBuckets";

/** First forwarded address, hashed. Missing or unusable values share the "unknown" bucket. */
export async function currentIpKey() {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  const first = forwarded?.split(",")[0];
  return hashClientIp(first || headerStore.get("x-real-ip"));
}
