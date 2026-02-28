import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    reactCompiler: true,
    serverExternalPackages: ["onnxruntime-node", "shiki", "sqlite-vec"],
};

export default nextConfig;
