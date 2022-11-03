/** @type {import('next').NextConfig} */
module.exports = {
  exportPathMap: function () {
    return {
      "/": { page: "/" },
    };
  },
  reactStrictMode: true,
  webpack: function (config, options) {
    config.experiments = { asyncWebAssembly: true };
    return config;
  },
};
