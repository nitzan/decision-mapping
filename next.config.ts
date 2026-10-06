import type { NextConfig } from "next";

// The CBS typefaces are served from criticalbusinessschool.com, proxied so they load same-origin.
const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/fonts/:file", destination: "https://www.criticalbusinessschool.com/assets/b/fonts/:file" }];
  },
};

export default nextConfig;
