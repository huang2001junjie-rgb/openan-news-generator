/// <reference types="node" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const gatewayTarget = env.VITE_GATEWAY_TARGET || ''

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5174,
      allowedHosts: true,
      proxy: {
        '/gateway': {
          target: gatewayTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/gateway/, ''),
          // 网关自签证书或内网 HTTPS 时放行
          secure: false,
        },
      },
    },
  }
})
