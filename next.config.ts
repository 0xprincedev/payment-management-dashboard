import os from "node:os";
import type { NextConfig } from "next";

function devOrigins() {
  const origins = new Set<string>();

  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      const family = entry.family as string | number;
      if (entry.internal || (family !== "IPv4" && family !== 4)) continue;
      origins.add(entry.address);
    }
  }

  return [...origins];
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: devOrigins(),
};

export default nextConfig;
