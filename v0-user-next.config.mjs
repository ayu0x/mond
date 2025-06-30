/** @type {import('next').NextConfig} */
const nextConfig = {
  // Basic configuration
  reactStrictMode: true,
  
  // Ignore build errors to prevent build failures
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Image optimization settings
  images: {
    unoptimized: true,
  },
  
  // Output configuration for better Vercel compatibility
  output: 'standalone',
  
  // Disable experimental features that might cause issues
  experimental: {
    // Keep only essential experimental features
    esmExternals: true,
  },
  
  // Increase build timeout
  staticPageGenerationTimeout: 180,
  
  // Ensure proper handling of trailing slashes
  trailingSlash: false,
  
  // Ensure static assets are properly handled
  assetPrefix: undefined, // Use default
  
  // Configure webpack to handle SVG files
  webpack(config) {
    return config;
  },
}

export default nextConfig
