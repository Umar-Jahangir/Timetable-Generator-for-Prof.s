/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Bundles the MUI packages listed below for smaller client bundles and
  // faster cold starts — the Next.js-recommended setting for MUI projects.
  transpilePackages: ["@mui/material", "@mui/icons-material"],
};

export default nextConfig;
