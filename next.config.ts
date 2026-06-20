import type { NextConfig } from "next";
import { execSync } from "child_process";
import path from "path";

// Execute setup script to ensure config is available
try {
  execSync(`node "${path.join(process.cwd(), "scripts", "setup-config.js")}"`, { stdio: "inherit" });
} catch (error) {
  console.error("Failed to run configuration setup script:", error);
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.182"],
  devIndicators: false,
  output: 'standalone'
};

export default nextConfig;
