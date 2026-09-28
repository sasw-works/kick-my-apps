/** @type {import('next').NextConfig} */
const nextConfig = {
  // The original standalone pages duplicated the Console and read data through the same APIs.
  // Old links (bookmarks, emails) now land on the Console equivalents, which require sign-in.
  async redirects() {
    return [
      { source: "/dashboard", destination: "/console", permanent: false },
      { source: "/history", destination: "/console/reports", permanent: false },
      { source: "/history/compare/:id", destination: "/console/compare/:id", permanent: false },
      { source: "/history/:id", destination: "/console/reports/:id", permanent: false },
    ];
  },
};

export default nextConfig;
