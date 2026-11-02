import { defineConfig, devices } from '@playwright/test';
import type { Isolation } from './options';

const browsers = [
  { name: 'chromium', device: devices['Desktop Chrome'] },
  { name: 'firefox', device: devices['Desktop Firefox'] },
  { name: 'webkit', device: devices['Desktop Safari'] },
];
const isolations: Isolation[] = ['iframe', 'shadow'];

export default defineConfig<{ isolation: Isolation }>({
  testDir: '.',
  testMatch: '*.spec.ts',
  globalSetup: './global-setup.ts',
  // Biome only reads the root .gitignore
  outputDir: '../node_modules/.cache/e2e-results',
  fullyParallel: true,
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
  },
  projects: browsers.flatMap(({ name, device }) =>
    isolations.map((isolation) => ({
      name: `${name}-${isolation}`,
      use: { ...device, isolation },
    })),
  ),
});
