/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    ROBOKASSA_LOGIN: process.env.ROBOKASSA_LOGIN,
    ROBOKASSA_PASS1: process.env.ROBOKASSA_PASS1,
    ROBOKASSA_PASS2: process.env.ROBOKASSA_PASS2,
  },
}

module.exports = nextConfig