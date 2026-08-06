/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [{ hostname: "images.pexels.com" }],
        unoptimized: true
    }
};

export default nextConfig;
