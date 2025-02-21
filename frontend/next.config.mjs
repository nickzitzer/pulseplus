import nextra from 'nextra'

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.jsx'
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: [
    '@uiw/react-markdown-preview',
    '@uiw/react-md-editor',
    'react-datepicker',
    'react-querybuilder'
  ],
  webpack: (config) => {
    config.module.rules.push({
      test: /\.css$/,
      use: ['style-loader', 'css-loader'],
      include: [
        /node_modules\/@uiw\/react-markdown-preview/,
        /node_modules\/@uiw\/react-md-editor/,
        /node_modules\/react-datepicker/,
        /node_modules\/react-querybuilder/,
        /src\/components/,
        /src\/styles/
      ],
    });
    return config;
  },
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  },
}

export default withNextra(nextConfig)