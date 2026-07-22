import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Next doesn't infer a parent directory as root
  // when unrelated lockfiles exist higher up the tree.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
