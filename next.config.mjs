/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent MIME-sniffing — browsers must respect Content-Type
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Block the site from being framed (clickjacking defense)
          { key: 'X-Frame-Options', value: 'DENY' },
          // Minimal referrer: origin only, no path/query in cross-origin requests
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Disable client-side feature APIs we don't use
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // CSP: broad protections without breaking Next.js.
          // script-src includes 'unsafe-inline' and 'unsafe-eval' because Next.js
          // relies on inline scripts and eval in dev; a nonce-based CSP requires
          // middleware and is a separate project. Even so, default-src, img-src,
          // style-src, connect-src, and font-src restrict what the browser loads.
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob:",
              `connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co'} https://api.anthropic.com`,
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; ') + ';'
          },
        ],
      },
    ]
  },
}

export default nextConfig
