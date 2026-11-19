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
  '/host.html': resolve(__dirname, 'fixtures/host.html'),
  '/frame.html': resolve(__dirname, 'fixtures/frame.html'),
  '/tooltip.html': resolve(__dirname, 'fixtures/tooltip.html'),
  '/harness.js': resolve(__dirname, '../node_modules/.cache/e2e-harness/harness.js'),
};

const INITIAL_FOCUS = 'tooltip-frame#root';

const TOOLTIP_ORDER = ['next', 'back', 'link', 'r1', 'text', 'close'].map(
  (id) => `tooltip-frame#${id}`,
);

// Counts document listeners only: Playwright adds its own on window
async function openHost(page: Page, isolation: Isolation) {
  await page.addInitScript(() => {
    const tracked = new Set(['keydown', 'focusin', 'pointerdown', 'click']);
    const w = window as Window & { __captureListeners?: number };
    w.__captureListeners = 0;
    const isCapture = (options: unknown) =>
      options === true ||
      (typeof options === 'object' &&
        options !== null &&
        'capture' in options &&
        Boolean((options as AddEventListenerOptions).capture));
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (tracked.has(type) && isCapture(options) && (this as Node).nodeType === 9) {
        w.__captureListeners! += 1;
      }
      return add.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function (type, listener, options) {
      if (tracked.has(type) && isCapture(options) && (this as Node).nodeType === 9) {
        w.__captureListeners! -= 1;
      }
      return remove.call(this, type, listener, options);
    };
  });
  await page.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    const file = FILES[path];
    if (!file) {
      await route.fulfill({ status: 404, body: '' });
      return;
    }
    await route.fulfill({
      body: readFileSync(file),
      contentType: path.endsWith('.js') ? 'text/javascript' : 'text/html',
    });
  });
  await page.goto(`${ORIGIN}/host.html?isolation=${isolation}`);
  await page.evaluate(() => (window as any).ready);
}

const tooltip = (page: Page, id = 'tooltip-frame') => {
  const isShadow = new URL(page.url()).searchParams.get('isolation') === 'shadow';
  return isShadow ? page.locator(`#${id}`) : page.frameLocator(`#${id}`);
};

const focusPath = (page: Page) => page.evaluate(() => (window as any).focusPath());

const activate = (page: Page, opts: Record<string, unknown>) =>
  page.evaluate((o) => (window as any).activate(o), opts);

const captureListeners = (page: Page) =>
  page.evaluate(() => {
    const count = (w: Window | null) => (w as any)?.__captureListeners ?? 0;
    return (
      count(window) +
      count((document.getElementById('host-frame') as HTMLIFrameElement).contentWindow) +
      count((document.getElementById('tooltip-frame') as HTMLIFrameElement).contentWindow)
    );
  });

const targetAttributes = (page: Page, selector = '#target') =>
  page.evaluate((s) => {
    const el = document.querySelector(s)!;
    return {
      tabindex: el.getAttribute('tabindex'),
      describedby: el.getAttribute('aria-describedby'),
      disabled: el.getAttribute('aria-disabled'),
    };
  }, selector);

async function pressAndExpect(page: Page, key: string, expected: string[]) {
  for (const path of expected) {
    await page.keyboard.press(key);
    expect(await focusPath(page)).toBe(path);
  }
}

test.beforeEach(async ({ page, isolation }) => {
  await openHost(page, isolation);
});

test('focus moves into the tooltip and the dialog is named after the step and heading', async ({
  page,
}) => {
  await page.focus('#before');
  await activate(page, { target: '#target' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  const label = await tooltip(page).locator('#root').getAttribute('aria-label');
  expect(label).toBe('Step 2 of 5: Welcome to reports');
});

test('the step opens with focus on the dialog and arrows are left to the screen reader', async ({
  page,
}) => {
  await activate(page, { target: '#target' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  const frame = tooltip(page);
  expect(await frame.locator('#root').getAttribute('aria-describedby')).toBe('hint');
  expect(await frame.locator('#hint').getAttribute('aria-hidden')).toBe('true');
  expect(await frame.locator('#heading').getAttribute('tabindex')).toBeNull();

  for (const key of ['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft']) {
    await page.keyboard.press(key);
    expect(await focusPath(page)).toBe(INITIAL_FOCUS);
  }

  await pressAndExpect(page, 'Tab', [TOOLTIP_ORDER[0]]);
  await pressAndExpect(page, 'Shift+Tab', ['#target']);
});

test('Tab and Shift+Tab cycle between target and tooltip controls', async ({ page }) => {
  await activate(page, { target: '#target' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);

  await pressAndExpect(page, 'Tab', [...TOOLTIP_ORDER, '#target', TOOLTIP_ORDER[0]]);
  await pressAndExpect(page, 'Shift+Tab', ['#target', TOOLTIP_ORDER[5], TOOLTIP_ORDER[4]]);
});

test('Shift+Tab from the tooltip container goes back to the target', async ({ page }) => {
  await activate(page, { target: '#target' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  await pressAndExpect(page, 'Shift+Tab', ['#target']);
});

test('arrow keys move through the loop except where widgets use them natively', async ({
  page,
}) => {
  await activate(page, { target: '#target' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  await pressAndExpect(page, 'Shift+Tab', ['#target']);
  await pressAndExpect(page, 'ArrowDown', [TOOLTIP_ORDER[0]]);
  await pressAndExpect(page, 'ArrowRight', [TOOLTIP_ORDER[1]]);
  await pressAndExpect(page, 'ArrowUp', [TOOLTIP_ORDER[0]]);
  await pressAndExpect(page, 'ArrowLeft', ['#target']);

  const radio = tooltip(page).locator('#r1');
  await radio.focus();
  await page.keyboard.press('ArrowDown');
  expect(await focusPath(page)).toMatch(/^tooltip-frame#r[23]$/);
  expect(await tooltip(page).locator('#r1').isChecked()).toBe(false);

  const text = tooltip(page).locator('#text');
  await text.focus();
  await page.keyboard.type('abc');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowUp');
  expect(await focusPath(page)).toBe('tooltip-frame#text');
  await pressAndExpect(page, 'Tab', ['tooltip-frame#close']);
});

test('Escape closes from the target and from the tooltip', async ({ page }) => {
  await activate(page, { target: '#target' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => (window as any).events.escape)).toBe(1);

  await activate(page, { target: '#target' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  await page.keyboard.press('Shift+Tab');
  expect(await focusPath(page)).toBe('#target');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => (window as any).events.escape)).toBe(2);
});

test('Escape closes from a text field target and a text field in the tooltip; Alt+Shift+X does not', async ({
  page,
}) => {
  await activate(page, { target: '#outside-input' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  await pressAndExpect(page, 'Shift+Tab', ['#outside-input']);
  await page.keyboard.press('Alt+Shift+KeyX');
  expect(await page.evaluate(() => (window as any).events.escape)).toBe(0);
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => (window as any).events.escape)).toBe(1);

  await activate(page, { target: '#target' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  await tooltip(page).locator('#text').focus();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => (window as any).events.escape)).toBe(2);
});

test('teardown restores focus to the target, removes attributes and listeners', async ({
  page,
}) => {
  const baseline = await captureListeners(page);
  const before = await targetAttributes(page);
  await page.focus('#before');
  await activate(page, { target: '#target' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);

  const during = await targetAttributes(page);
  expect(during.tabindex).toBeNull(); // Natively focusable: no tabindex added
  expect(during.describedby).toMatch(/^host-help usertour-step-description-\d+$/);
  const description = await page.evaluate(
    (ids) => document.getElementById(ids!.split(' ')[1])?.textContent,
    during.describedby,
  );
  expect(description).toBe(
    'Step 2 of 5: Welcome to reports. Press Tab to move to the tour step. Press Escape to close the tour.',
  );
  expect(await captureListeners(page)).toBeGreaterThan(baseline);

  await page.evaluate(() => (window as any).manager.destroy(true));
  expect(await focusPath(page)).toBe('#target');
  expect(await targetAttributes(page)).toEqual(before);
  expect(await page.locator('[id^="usertour-step-description-"]').count()).toBe(0);
  expect(await captureListeners(page)).toBe(baseline);

  await page.keyboard.press('Tab');
  expect(await focusPath(page)).toBe('#wrap-input');
});

test('a text target is not a tab stop and focus returns to where it was before', async ({
  page,
}) => {
  await page.focus('#outside-input');
  await activate(page, { target: '#target-div', blockTarget: true });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  const untouched = { tabindex: null, describedby: null, disabled: null };
  expect(await targetAttributes(page, '#target-div')).toEqual(untouched);
  expect(await page.locator('[id^="usertour-step-description-"]').count()).toBe(0);

  await pressAndExpect(page, 'Shift+Tab', [TOOLTIP_ORDER[5], TOOLTIP_ORDER[4]]);
  await pressAndExpect(page, 'Tab', [TOOLTIP_ORDER[5], TOOLTIP_ORDER[0]]);
  await pressAndExpect(page, 'ArrowUp', [TOOLTIP_ORDER[5]]);

  await page.evaluate(() => (window as any).manager.destroy(true));
  expect(await targetAttributes(page, '#target-div')).toEqual(untouched);
  expect(await focusPath(page)).toBe('#outside-input');
});

test('a text target with a control inside: only the control joins the loop', async ({ page }) => {
  await activate(page, { target: '#target-wrap' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  expect((await targetAttributes(page, '#target-wrap')).tabindex).toBeNull();
  await pressAndExpect(page, 'Shift+Tab', ['#wrap-input', TOOLTIP_ORDER[5]]);
  await pressAndExpect(page, 'Tab', ['#wrap-input', TOOLTIP_ORDER[0]]);
});

test('a widget role target without tabindex joins the loop with tabindex=-1', async ({ page }) => {
  await activate(page, { target: '#target-role' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  expect((await targetAttributes(page, '#target-role')).tabindex).toBe('-1');
  await pressAndExpect(page, 'Shift+Tab', ['#target-role']);

  await page.evaluate(() => (window as any).manager.destroy(true));
  expect((await targetAttributes(page, '#target-role')).tabindex).toBeNull();
});

test('a gridcell role target without tabindex joins the loop', async ({ page }) => {
  await activate(page, { target: '#target-gridcell' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  expect((await targetAttributes(page, '#target-gridcell')).tabindex).toBe('-1');
  await pressAndExpect(page, 'Shift+Tab', ['#target-gridcell']);
});

// Roving tabindex (Dojo, Radix, MUI): an inactive tab has tabindex="-1" but is still a widget
test('an inactive tab target (role="tab" tabindex="-1") joins the loop', async ({ page }) => {
  await activate(page, { target: '#tab-two' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  await pressAndExpect(page, 'Shift+Tab', ['#tab-two']);

  await page.evaluate(() => (window as any).manager.destroy(true));
  expect((await targetAttributes(page, '#tab-two')).tabindex).toBe('-1');
});

test('a composite role target with no tab stop inside joins the loop itself', async ({ page }) => {
  await activate(page, { target: '#target-listbox' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  await pressAndExpect(page, 'Shift+Tab', ['#target-listbox']);
});

test('a composite role target with a roving tabindex: only the active child joins', async ({
  page,
}) => {
  await activate(page, { target: '#target-tablist' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  expect((await targetAttributes(page, '#target-tablist')).tabindex).toBeNull();
  await pressAndExpect(page, 'Shift+Tab', ['#tab-one', TOOLTIP_ORDER[5]]);
});

test('a script-only focusable target (tabindex=-1) is not a tab stop', async ({ page }) => {
  await page.evaluate(() => document.getElementById('target-div')!.setAttribute('tabindex', '-1'));
  await activate(page, { target: '#target-div' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  await pressAndExpect(page, 'Shift+Tab', [TOOLTIP_ORDER[5]]);
});

test('retarget to a text target moves focus from the old target into the tooltip', async ({
  page,
}) => {
  await activate(page, { target: '#target' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  await pressAndExpect(page, 'Shift+Tab', ['#target']);
  await page.evaluate(() =>
    (window as any).manager.retarget(document.getElementById('target-div')),
  );
  expect(await focusPath(page)).toBe('tooltip-frame#root');
  await pressAndExpect(page, 'Shift+Tab', [TOOLTIP_ORDER[5]]);
});

test('focus moved away by script is pulled back; a mouse click is not', async ({ page }) => {
  await activate(page, { target: '#target' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  await page.keyboard.press('Tab');
  expect(await focusPath(page)).toBe(TOOLTIP_ORDER[0]);

  await page.evaluate(() => (document.getElementById('after') as HTMLElement).focus());
  expect(await focusPath(page)).toBe(TOOLTIP_ORDER[0]);

  await page.click('#outside-input');
  expect(await focusPath(page)).toBe('#outside-input');
  await page.keyboard.press('Tab');
  expect(await focusPath(page)).toBe('#target');
  await page.keyboard.press('Tab');
  expect(await focusPath(page)).toBe(TOOLTIP_ORDER[0]);
});

test('the guard gives up when host code keeps stealing focus', async ({ page }) => {
  await activate(page, { target: '#target' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  const result = await page.evaluate(() => {
    const thief = document.getElementById('after') as HTMLElement;
    let steals = 0;
    const steal = () => {
      if (steals < 50 && document.activeElement !== thief) {
        steals++;
        thief.focus();
      }
    };
    document.addEventListener('focusin', steal);
    thief.focus();
    document.removeEventListener('focusin', steal);
    return steals;
  });
  expect(result).toBeLessThan(50);
  expect(await focusPath(page)).toBe('#after');
});

test('retarget moves the loop and attributes to the re-rendered target', async ({ page }) => {
  await activate(page, { target: '#target' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  await page.keyboard.press('Shift+Tab');
  expect(await focusPath(page)).toBe('#target');

  await page.evaluate(() => {
    const old = document.getElementById('target')!;
    const replacement = document.createElement('button');
    replacement.id = 'target-new';
    replacement.textContent = 'New target';
    old.after(replacement);
    old.remove();
    (window as any).manager.retarget(replacement);
    (window as any).oldTarget = old;
  });
  expect(await focusPath(page)).toBe('#target-new');
  expect((await targetAttributes(page, '#target-new')).describedby).toMatch(
    /^usertour-step-description-\d+$/,
  );
  const oldDescribedBy = await page.evaluate(() =>
    (window as any).oldTarget.getAttribute('aria-describedby'),
  );
  expect(oldDescribedBy).toBe('host-help');
  await pressAndExpect(page, 'Tab', [TOOLTIP_ORDER[0]]);
  await pressAndExpect(page, 'Shift+Tab', ['#target-new']);
});

test('a target in a same-origin host iframe joins the loop', async ({ page }) => {
  const baseline = await captureListeners(page);
  await activate(page, { target: 'iframe' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  await pressAndExpect(page, 'Shift+Tab', ['host-frame#iframe-target']);
  expect(await page.locator('[data-usertour-focus-ring]').count()).toBe(1);

  await pressAndExpect(page, 'Tab', [TOOLTIP_ORDER[0]]);
  expect(await page.locator('[data-usertour-focus-ring]').count()).toBe(0);
  await pressAndExpect(page, 'Shift+Tab', ['host-frame#iframe-target']);
  await pressAndExpect(page, 'ArrowDown', [TOOLTIP_ORDER[0]]);

  await page.keyboard.press('Shift+Tab');
  await page
    .frameLocator('#host-frame')
    .locator('#iframe-other')
    .evaluate((el: HTMLElement) => el.focus());
  expect(await focusPath(page)).toBe('host-frame#iframe-target');

  await page.evaluate(() => (window as any).manager.destroy(true));
  expect(await focusPath(page)).toBe('host-frame#iframe-target');
  const attrs = await page
    .frameLocator('#host-frame')
    .locator('#iframe-target')
    .evaluate((el) => el.getAttribute('aria-describedby'));
  expect(attrs).toBeNull();
  expect(await captureListeners(page)).toBe(baseline);
});

test('a blocked target can take focus but acts disabled', async ({ page }) => {
  await activate(page, { target: '#target', blockTarget: true });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  expect((await targetAttributes(page)).disabled).toBe('true');
  await page.keyboard.press('Shift+Tab');
  expect(await focusPath(page)).toBe('#target');
  await page.keyboard.press('Enter');
  await page.keyboard.press(' ');
  await page.evaluate(() => document.getElementById('target')!.click());
  expect(await page.evaluate(() => (window as any).events)).toMatchObject({
    targetClicks: 0,
    targetEnter: 0,
  });
  await pressAndExpect(page, 'Tab', [TOOLTIP_ORDER[0]]);

  await page.evaluate(() => (window as any).manager.destroy(true));
  expect((await targetAttributes(page)).disabled).toBeNull();
  await page.evaluate(() => document.getElementById('target')!.click());
  expect(await page.evaluate(() => (window as any).events.targetClicks)).toBe(1);
});

test('the target focus ring is drawn by the SDK around the target', async ({ page }) => {
  await activate(page, { target: '#target' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  await page.keyboard.press('Shift+Tab');
  const ring = page.locator('[data-usertour-focus-ring]');
  await expect(ring).toHaveCount(1);
  const [ringBox, targetBox] = await Promise.all([
    ring.boundingBox(),
    page.locator('#target').boundingBox(),
  ]);
  expect(ringBox!.x).toBeCloseTo(targetBox!.x - 2, 0);
  expect(ringBox!.width).toBeCloseTo(targetBox!.width + 4, 0);
});

test('modal: focus cycles in the modal only and the page is inert', async ({ page }) => {
  const baseline = await captureListeners(page);
  await page.focus('#before');
  await activate(page, { mode: 'modal', inertPage: true });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);

  const inertIds = await page.evaluate(() =>
    Array.from(document.body.children)
      .filter((el) => el.hasAttribute('inert'))
      .map((el) => el.id),
  );
  expect(inertIds).toContain('before');
  expect(inertIds).toContain('already-inert');
  expect(inertIds).not.toContain('usertour-widget');

  await pressAndExpect(page, 'Tab', [...TOOLTIP_ORDER, TOOLTIP_ORDER[0]]);
  await pressAndExpect(page, 'Shift+Tab', [TOOLTIP_ORDER[5]]);

  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => (window as any).events.escape)).toBe(1);
  const stillInert = await page.evaluate(() =>
    Array.from(document.body.children)
      .filter((el) => el.hasAttribute('inert'))
      .map((el) => el.id),
  );
  expect(stillInert).toEqual(['already-inert']);
  expect(await focusPath(page)).toBe('#before');
  expect(await captureListeners(page)).toBe(baseline);
});

test('next step: the loop moves to the new tooltip, then close restores the original focus', async ({
  page,
}) => {
  await page.focus('#before');
  await activate(page, { target: '#target' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  await page.keyboard.press('Tab');

  await page.evaluate(async () => {
    const w = window as any;
    w.manager.suspend();
    document.getElementById('tooltip-frame')!.remove();
    await w.addTooltipFrame('tooltip-frame-2');
    w.activate({ frameId: 'tooltip-frame-2', mode: 'modal' });
  });
  await expect.poll(() => focusPath(page)).toBe('tooltip-frame-2#root');
  await page.keyboard.press('Tab');
  expect(await focusPath(page)).toBe('tooltip-frame-2#next');

  await page.evaluate(() => (window as any).manager.destroy(true));
  expect(await focusPath(page)).toBe('#target');
});

test('screen reader text is French when the page language is French', async ({ page }) => {
  const stringsFor = (lang: string | null) =>
    page.evaluate((l) => {
      if (l === null) {
        document.documentElement.removeAttribute('lang');
      } else {
        document.documentElement.setAttribute('lang', l);
      }
      const strings = (window as any).UsertourFocusTest.getTourStrings();
      return {
        lang: strings.lang,
        label: strings.stepLabel(2, 5),
        escape: strings.escapeHint,
      };
    }, lang);

  for (const lang of ['fr', 'fr-CA', 'FR-ca', 'fr_CA', ' fr-FR ']) {
    expect(await stringsFor(lang)).toEqual({
      lang: lang.trim(),
      label: 'Étape 2 sur 5',
      escape: 'Appuyez sur Échap pour fermer la visite guidée.',
    });
  }
  for (const lang of ['en', 'en-CA', 'frr', 'de']) {
    expect((await stringsFor(lang)).label).toBe('Step 2 of 5');
  }
  expect(await stringsFor(null)).toEqual({
    lang: undefined,
    label: 'Step 2 of 5',
    escape: 'Press Escape to close the tour.',
  });

  await stringsFor('fr-CA');
  await activate(page, { target: '#target' });
  await expect.poll(() => focusPath(page)).toBe(INITIAL_FOCUS);
  expect(await tooltip(page).locator('#root').getAttribute('aria-label')).toBe(
    'Étape 2 sur 5\u00a0: Welcome to reports',
  );
  const description = await page.evaluate(() => {
    const ids = document.getElementById('target')!.getAttribute('aria-describedby')!.split(' ');
    const node = document.getElementById(ids[ids.length - 1])!;
    return { text: node.textContent, lang: node.getAttribute('lang') };
  });
  expect(description).toEqual({
    text: `Étape 2 sur 5\u00a0: Welcome to reports. Appuyez sur Tab pour aller à l'étape de la visite guidée. Appuyez sur Échap pour fermer la visite guidée.`,
    lang: 'fr-CA',
  });
});
