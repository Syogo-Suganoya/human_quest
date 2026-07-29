import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // パスに日本語ディレクトリが含まれる環境でルート誤推定によるTurbopackの
  // パニックを避けるため、ワークスペースルートをこのアプリに固定する
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
