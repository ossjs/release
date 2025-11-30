import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/**/*.ts', '!**/__test__'],
  format: 'esm',
  outExtensions: () => ({
    js: '.js',
    dts: '.d.ts',
  }),
  outDir: './bin/build/',
  tsconfig: './tsconfig.src.json',
  unbundle: true,
})
