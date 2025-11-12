import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/**/*.ts', '!**/__test__'],
  format: 'esm',
  fixedExtension: true,
  outDir: './bin/build/',
  tsconfig: './tsconfig.src.json',
  unbundle: true,
})
