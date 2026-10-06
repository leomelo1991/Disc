// Empacota a API em um único dist/main.js. Na Vercel o node_modules do pnpm (symlinks) não vai junto
// com a função, então tudo que é JavaScript puro é embutido; só o binário nativo fica externo.
import { build } from 'esbuild';

await build({
  entryPoints: ['src/main.ts'],
  outfile: 'dist/main.js',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  sourcemap: true,
  external: [
    '@node-rs/argon2',
    '@nestjs/microservices',
    '@nestjs/websockets',
    '@nestjs/platform-fastify',
    'class-validator',
    'class-transformer',
  ],
  logLevel: 'info',
});
