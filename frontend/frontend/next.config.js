/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    env: {
      NEXT_PUBLIC_STARKNET_PROVIDER_URL: process.env.NEXT_PUBLIC_STARKNET_PROVIDER_URL,
      NEXT_PUBLIC_ACCOUNT_ADDRESS: process.env.NEXT_PUBLIC_ACCOUNT_ADDRESS,
      NEXT_PUBLIC_PRIVATE_KEY: process.env.NEXT_PUBLIC_PRIVATE_KEY,
      NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
    }
  };
  
  module.exports = nextConfig;