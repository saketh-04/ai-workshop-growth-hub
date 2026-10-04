import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
