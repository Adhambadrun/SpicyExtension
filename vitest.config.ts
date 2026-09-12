import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'https://agentsearch.vercel.app/flights', pretendToBeVisual: true } },
    restoreMocks: true,
  },
});
