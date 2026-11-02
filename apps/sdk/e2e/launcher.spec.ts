import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Page, expect, test as base } from '@playwright/test';
import type { Isolation } from './options';

const test = base.extend<{ isolation: Isolation }>({
  isolation: ['iframe', { option: true }],
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const ORIGIN = 'http://usertour.test';

const FILES: Record<string, string> = {
  '/launcher.html': resolve(__dirname, 'fixtures/launcher.html'),
  '/launcher.css': resolve(__dirname, '../../../packages/shared/assets/sdk/index.css'),
  '/launcher-harness.js': resolve(
    __dirname,
    '../node_modules/.cache/e2e-harness/launcher-harness.js',
  ),
};

async function openLauncher(page: Page, query = '') {
  await page.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    const file = FILES[path];
    if (!file) {
      await route.fulfill({ status: 404, body: '' });
      return;
    }
    await route.fulfill({
      body: readFileSync(file),
      contentType: path.endsWith('.js')
        ? 'text/javascript'
        : path.endsWith('.css')
          ? 'text/css'
          : 'text/html',
    });
  });
  await page.goto(`${ORIGIN}/launcher.html?${query}`);
  await expect(page.locator('button[data-usertour-launcher-focus]')).toHaveCount(1);
}

const focused = (page: Page) =>
  page.evaluate(() => {
    let el: Element | null = document.activeElement;
    while (el?.shadowRoot?.activeElement) {
      el = el.shadowRoot.activeElement;
    }
    if (!el || el === document.body) {
      return 'body';
    }
    const name = el.getAttribute('aria-label') || el.textContent?.trim() || '';
    return `${el.getAttribute('role') || el.tagName.toLowerCase()}:${name}`;
  });

const press = async (page: Page, key: string, times: number) => {
  const stops: string[] = [];
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key);
    stops.push(await focused(page));
  }
  return stops;
};

const launcherButton = (page: Page, name: string | RegExp = 'Help: Save') =>
  page.getByRole('button', { name });

test.beforeEach(({ isolation }) => {
  test.skip(isolation === 'iframe', 'The launcher tooltip is rendered in a shadow root');
});

for (const side of ['right', 'bottom'] as const) {
  test(`a launcher on the ${side} comes right after its target`, async ({ page }) => {
    await openLauncher(page, `side=${side}`);
    await page.locator('#before').focus();
    expect(await press(page, 'Tab', 3)).toEqual([
      'button:Save',
      'button:Help: Save',
      'button:After',
    ]);
    expect(await press(page, 'Shift+Tab', 2)).toEqual(['button:Help: Save', 'button:Save']);
  });
}

for (const side of ['top', 'left'] as const) {
  test(`a launcher on the ${side} comes right before its target`, async ({ page }) => {
    await openLauncher(page, `side=${side}`);
    await page.locator('#before').focus();
    expect(await press(page, 'Tab', 3)).toEqual([
      'button:Help: Save',
      'button:Save',
      'button:After',
    ]);
  });
}

test('the launcher is not reached again at the end of the page', async ({ page }) => {
  await openLauncher(page);
  await expect(page.locator('.usertour-widget-launcher')).toHaveAttribute('aria-hidden', 'true');
  await expect(launcherButton(page)).toHaveCount(1);
  await page.locator('#end').focus();
  await page.keyboard.press('Tab');
  expect(await focused(page)).not.toBe('button:Help: Save');
});

test('the visual launcher shows a focus ring while its button has focus', async ({ page }) => {
  await openLauncher(page);
  await page.addStyleTag({
    content: 'button, * { outline: none !important; box-shadow: none !important; }',
  });
  const visual = page.locator('.usertour-widget-launcher');
  expect(await visual.evaluate((el) => el.getRootNode() instanceof ShadowRoot)).toBe(true);
  const ring = () => visual.evaluate((el) => getComputedStyle(el).boxShadow);
  await page.locator('#target').focus();
  await page.keyboard.press('Tab');
  await expect(visual).toHaveAttribute('data-usertour-focused', '');
  await expect.poll(ring).toContain('rgb(255, 255, 255)');
  await expect.poll(ring).toContain('rgb(26, 26, 26)');
  await page.keyboard.press('Tab');
  await expect(visual).not.toHaveAttribute('data-usertour-focused');
  await expect.poll(ring).toBe('none');
});

test('a button launcher is named by its text, an icon by its target', async ({ page }) => {
  await openLauncher(page, 'button=1');
  await expect(launcherButton(page, 'Learn more')).toHaveAttribute('aria-haspopup', 'dialog');

  await page.goto(`${ORIGIN}/launcher.html?target=heading`);
  await expect(launcherButton(page, 'Help: Billing settings')).toHaveCount(1);
  const next = await page.evaluate(() =>
    document
      .getElementById('heading')
      ?.nextElementSibling?.hasAttribute('data-usertour-launcher-focus'),
  );
  expect(next).toBe(true);
});

test('Enter opens the tooltip with focus in it; Escape closes it back on the launcher', async ({
  page,
}) => {
  await openLauncher(page);
  await launcherButton(page).focus();
  await expect(launcherButton(page)).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Enter');
  await expect.poll(() => focused(page)).toBe('dialog:Help: Save');
  await expect(launcherButton(page)).toHaveAttribute('aria-expanded', 'true');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAccessibleDescription('Press Escape to close the tooltip.');
  expect(
    await dialog.evaluate((root) => root.querySelector('p.usertour-visually-hidden')?.textContent),
  ).toBe('Tooltip pointing to button Save.');

  await page.keyboard.press('Escape');
  await expect.poll(() => focused(page)).toBe('button:Help: Save');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(launcherButton(page)).toHaveAttribute('aria-expanded', 'false');
});

test('Tab past the tooltip continues after the target; Shift+Tab goes back to the launcher', async ({
  page,
}) => {
  await openLauncher(page);
  await launcherButton(page).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => focused(page)).toBe('dialog:Help: Save');

  await page.keyboard.press('Tab');
  expect(await focused(page)).toMatch(/^a:/);
  await page.keyboard.press('Tab');
  await expect.poll(() => focused(page)).toBe('button:After');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await launcherButton(page).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => focused(page)).toBe('dialog:Help: Save');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => focused(page)).toBe('button:Help: Save');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('a launcher that runs actions runs them on Enter', async ({ page }) => {
  await openLauncher(page, 'action=1');
  const button = launcherButton(page);
  await expect(button).not.toHaveAttribute('aria-haspopup');
  await button.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  expect(await page.evaluate(() => (window as any).launcherTest.events.actions)).toBe(2);
});

test('French page', async ({ page }) => {
  await openLauncher(page, 'lang=fr-CA');
  const button = launcherButton(page, 'Aide\u00a0: Save');
  await expect(button).toHaveAttribute('lang', 'fr-CA');
  await button.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toHaveAccessibleDescription("Appuyez sur Échap pour fermer l'infobulle.");
  expect(
    await dialog.evaluate((root) => root.querySelector('p.usertour-visually-hidden')?.textContent),
  ).toBe('Infobulle pointant vers le bouton Save.');
});

test('the launcher is a button, kept for the mouse only', async ({ page }) => {
  await openLauncher(page);
  const visual = page.locator('.usertour-widget-launcher');
  expect(await visual.evaluate((el) => el.tagName)).toBe('BUTTON');
  await expect(visual).toHaveAttribute('type', 'button');
  await expect(visual).toHaveAttribute('tabindex', '-1');
  await expect(visual).toHaveAttribute('aria-hidden', 'true');
  await visual.click();
  await expect(page.getByRole('dialog')).toHaveCount(1);
});

test('a launcher on text scrolled out of view is reached by Tab and scrolled in', async ({
  page,
}) => {
  await openLauncher(page, 'target=far');
  const visual = page.locator('.usertour-widget-launcher');
  await expect(visual).toHaveCount(0);
  await page.locator('#last').focus();
  await page.keyboard.press('Tab');
  expect(await focused(page)).toBe('button:Help: Far text');
  await expect(page.locator('#far')).toBeInViewport();
  await expect(visual).toHaveAttribute('data-usertour-focused', '');
  await page.keyboard.press('Tab');
  expect(await focused(page)).toBe('button:End of page');
});

test('Enter on a launcher scrolled out of view opens its tooltip once in view', async ({
  page,
}) => {
  await openLauncher(page, 'target=far');
  await page.evaluate(() => {
    const button = document.querySelector<HTMLButtonElement>('[data-usertour-launcher-focus]');
    button?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  });
  await page.keyboard.press('Enter');
  await expect.poll(() => focused(page)).toBe('dialog:Help: Far text');
});

test('a target the page hides gets no launcher button', async ({ page }) => {
  await openLauncher(page, 'target=hidden-text');
  await page.locator('#last').focus();
  await page.keyboard.press('Tab');
  expect(await focused(page)).toBe('button:End of page');
});

test('the button goes back next to the target when the page re-renders around it', async ({
  page,
}) => {
  await openLauncher(page);
  await page.evaluate(() => {
    const target = document.getElementById('target')!;
    const after = document.getElementById('after')!;
    document.querySelector('[data-usertour-launcher-focus]')!.remove();
    after.replaceWith(after.cloneNode(true));
    target.after(document.createTextNode(' '));
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        (document.getElementById('target')?.nextSibling as Element | null)?.hasAttribute?.(
          'data-usertour-launcher-focus',
        ),
      ),
    )
    .toBe(true);
});

test('a target shown after the launcher rendered (faded in) is reached', async ({ page }) => {
  await openLauncher(page, 'target=fading');
  await page.locator('#after').focus();
  await page.keyboard.press('Tab');
  expect(await focused(page)).toBe('button:Last page button');
  await page.evaluate(() => {
    document.getElementById('fading')!.style.opacity = '1';
  });
  await page.locator('#after').focus();
  await page.keyboard.press('Tab');
  expect(await focused(page)).toBe('button:Help: Fading text');
});

test('in a page modal with a focus trap, the launcher keeps its place after its target', async ({
  page,
}) => {
  await openLauncher(page, 'target=modal-target');
  await page.locator('#modal-first').focus();
  expect(await press(page, 'Tab', 4)).toEqual([
    'button:Save in modal',
    'button:Help: Save in modal',
    'button:Modal last',
    'button:Modal first',
  ]);
  expect(await press(page, 'Shift+Tab', 3)).toEqual([
    'button:Modal last',
    'button:Help: Save in modal',
    'button:Save in modal',
  ]);
});

// Like Carbon modals: the trap only wraps at controls listed when it opened
for (const trap of ['cached', 'cached-capture']) {
  test(`a modal that wraps at its first control, listed before the launcher, does not skip a left launcher (${trap})`, async ({
    page,
  }) => {
    await openLauncher(page, `side=left&target=modal-first&trap=${trap}`);
    await page.locator('#modal-last').focus();
    expect(await press(page, 'Tab', 3)).toEqual([
      'button:Help: Modal first',
      'button:Modal first',
      'button:Save in modal',
    ]);
    expect(await press(page, 'Shift+Tab', 2)).toEqual([
      'button:Modal first',
      'button:Help: Modal first',
    ]);
  });
}

for (const trap of ['cached', 'cached-capture']) {
  test(`a modal that wraps at its last control, listed before the launcher, does not skip a right launcher (${trap})`, async ({
    page,
  }) => {
    await openLauncher(page, `side=right&target=modal-last&trap=${trap}`);
    await page.locator('#modal-target').focus();
    expect(await press(page, 'Tab', 2)).toEqual(['button:Modal last', 'button:Help: Modal last']);
    // Not a skip
    expect(await press(page, 'Shift+Tab', 1)).toEqual(['button:Modal last']);
    await page.locator('#modal-first').focus();
    expect(await press(page, 'Shift+Tab', 2)).toEqual([
      'button:Help: Modal last',
      'button:Modal last',
    ]);
  });
}

test('in a page modal, a launcher after the last control is not skipped by the wrap', async ({
  page,
}) => {
  await openLauncher(page, 'target=modal-last');
  await page.locator('#modal-target').focus();
  expect(await press(page, 'Tab', 3)).toEqual([
    'button:Modal last',
    'button:Help: Modal last',
    'button:Modal first',
  ]);
});

test('a modal that moves focus again a moment later (Carbon end marker) does not skip a left launcher', async ({
  page,
}) => {
  await openLauncher(page, 'side=left&target=modal-first&trap=sentinel');
  await page.locator('#modal-last').focus();
  await page.keyboard.press('Tab');
  await expect.poll(() => focused(page)).toBe('button:Help: Modal first');
  await page.keyboard.press('Tab');
  await expect.poll(() => focused(page)).toBe('button:Modal first');
  await page.keyboard.press('Shift+Tab');
  await expect.poll(() => focused(page)).toBe('button:Help: Modal first');
  await page.waitForTimeout(100);
  expect(await focused(page)).toBe('button:Help: Modal first');
  await page.keyboard.press('Tab');
  await expect.poll(() => focused(page)).toBe('button:Modal first');
});

// Like focus-trap, Radix and MUI: they list controls when Tab wraps, so the launcher is included
for (const trap of ['focus-trap', 'radix', 'mui']) {
  test(`a modal trap like ${trap} keeps a left launcher before its target`, async ({ page }) => {
    await openLauncher(page, `side=left&target=modal-first&trap=${trap}`);
    await page.locator('#modal-last').focus();
    expect(await press(page, 'Tab', 3)).toEqual([
      'button:Help: Modal first',
      'button:Modal first',
      'button:Save in modal',
    ]);
    expect(await press(page, 'Shift+Tab', 3)).toEqual([
      'button:Modal first',
      'button:Help: Modal first',
      'button:Modal last',
    ]);
  });

  test(`a modal trap like ${trap} keeps a right launcher after its target`, async ({ page }) => {
    await openLauncher(page, `side=right&target=modal-last&trap=${trap}`);
    await page.locator('#modal-target').focus();
    expect(await press(page, 'Tab', 3)).toEqual([
      'button:Modal last',
      'button:Help: Modal last',
      'button:Modal first',
    ]);
    expect(await press(page, 'Shift+Tab', 2)).toEqual([
      'button:Help: Modal last',
      'button:Modal last',
    ]);
  });
}

test('a modal that moves focus later than the Tab window skips the launcher, and says so in the debug log', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('debug', 'usertour-widget:launcher'));
  const warnings: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
  });
  await openLauncher(page, 'side=left&target=modal-first&trap=slow');
  await page.locator('#modal-last').focus();
  await page.keyboard.press('Tab');
  // 200 ms is past the default 100 ms window
  await expect.poll(() => focused(page)).toBe('button:Modal first');
  await expect.poll(() => warnings.join('\n')).toContain('skipped the launcher');
  expect(warnings.join('\n')).toContain('setLauncherFocusTiming');
});

test('a longer Tab window (setLauncherFocusTiming) fixes a modal that moves focus late', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('debug', 'usertour-widget:launcher'));
  const logs: string[] = [];
  page.on('console', (message) => logs.push(message.text()));
  await openLauncher(page, 'side=left&target=modal-first&trap=slow&tabWindowMs=400');
  await page.locator('#modal-last').focus();
  await page.keyboard.press('Tab');
  await expect.poll(() => focused(page)).toBe('button:Help: Modal first');
  expect(logs.join('\n')).toContain('page script skipped the launcher: focus moved to it');
  await page.keyboard.press('Tab');
  await expect.poll(() => focused(page)).toBe('button:Modal first');
});

test('the environment focus trap setting picks the timing: "slow" fixes a modal that moves focus late', async ({
  page,
}) => {
  await openLauncher(page, 'side=left&target=modal-first&trap=slow&environmentTrap=slow');
  await page.locator('#modal-last').focus();
  await page.keyboard.press('Tab');
  await expect.poll(() => focused(page)).toBe('button:Help: Modal first');
});

test('a focus trap setting that needs no fix leaves focus where the page put it, and says so in the debug log', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('debug', 'usertour-widget:launcher'));
  const warnings: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
  });
  await openLauncher(page, 'side=left&target=modal-first&trap=cached&environmentTrap=radix');
  await page.locator('#modal-last').focus();
  await page.keyboard.press('Tab');
  expect(await focused(page)).toBe('button:Modal first');
  await expect.poll(() => warnings.join('\n')).toContain('focus trap setting is "radix"');
});

test('setLauncherFocusTiming in the host app wins over the environment setting', async ({
  page,
}) => {
  await openLauncher(
    page,
    'side=left&target=modal-first&trap=slow&environmentTrap=cached&tabWindowMs=400',
  );
  await page.locator('#modal-last').focus();
  await page.keyboard.press('Tab');
  await expect.poll(() => focused(page)).toBe('button:Help: Modal first');
});
