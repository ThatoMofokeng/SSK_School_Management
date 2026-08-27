/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            { hostname: "images.pexels.com" },
            { hostname: "res.cloudinary.com" }
        ],
        formats: ["image/avif", "image/webp"],
    },

    // Security headers
    async headers() {
        return [
            {
                // Apply security headers to all routes
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()'
                    },
                    {
                        // Content Security Policy
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.accounts.dev https://challenges.cloudflare.com https://upload-widget.cloudinary.com",
                            "style-src 'self' 'unsafe-inline'",
                            "img-src 'self' data: blob: https://images.pexels.com https://res.cloudinary.com https://img.clerk.com",
                            "font-src 'self' data:",
                            "connect-src 'self' https://*.clerk.accounts.dev https://*.supabase.co https://challenges.cloudflare.com https://api.cloudinary.com",
                            "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev",
                        ].join('; ')
                    }
                ],
            },
        ];
    },
};

export default nextConfig;
