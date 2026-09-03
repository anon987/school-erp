/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@schoolerp/ui", "@schoolerp/integrations", "@schoolerp/types"],
};

export default nextConfig;
