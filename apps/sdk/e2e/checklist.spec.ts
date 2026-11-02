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
  '/checklist.html': resolve(__dirname, 'fixtures/checklist.html'),
  '/checklist-harness.js': resolve(
    __dirname,
    '../node_modules/.cache/e2e-harness/checklist-harness.js',
  ),
};

async function openChecklist(page: Page, query = '') {
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
  await page.goto(`${ORIGIN}/checklist.html?${query}`);
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

const launcher = (page: Page, name: string | RegExp = 'Get started, 2 tasks left') =>
  page.getByRole('button', { name });

const panel = (page: Page) => page.getByRole('dialog', { name: 'Get started' });

const checklistTest = (page: Page, script: string) =>
  page.evaluate(`window.checklistTest.${script}`);

test.beforeEach(({ isolation }) => {
  test.skip(isolation === 'iframe', 'The checklist is rendered in a shadow root');
});

test('the bypass block is the first element of the page and goes to the checklist', async ({
  page,
}) => {
  await openChecklist(page);
  await expect(launcher(page)).toBeVisible();

  const firstId = await page.evaluate(() => document.body.firstElementChild?.id);
  expect(firstId).toBe('usertour-bypass-block');

  const link = page.getByRole('link', { name: 'Skip to interactive help menu' });
  expect((await link.boundingBox())?.width ?? 0).toBeLessThanOrEqual(1);

  await page.keyboard.press('Tab');
  expect(await focused(page)).toBe('a:Skip to interactive help menu');
  expect((await link.boundingBox())?.width ?? 0).toBeGreaterThan(50);

  await page.keyboard.press('Enter');
  expect(await focused(page)).toBe('button:Get started, 2 tasks left');
});

test('the bypass block goes to the panel when the checklist is expanded', async ({ page }) => {
  await openChecklist(page, 'expanded=1');
  await expect(panel(page)).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  expect(await focused(page)).toBe('dialog:Get started');
});

test('the launcher is a button that opens the panel and moves focus into it', async ({ page }) => {
  await openChecklist(page);
  const button = launcher(page);
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(button).toHaveAttribute('aria-haspopup', 'dialog');

  await button.focus();
  await page.keyboard.press('Enter');
  await expect(panel(page)).toBeVisible();
  await expect(panel(page)).toHaveAccessibleDescription('Press Escape to collapse the checklist.');
  await expect.poll(() => focused(page)).toBe('dialog:Get started');
  await expect(panel(page)).not.toHaveAttribute('aria-modal', 'true');
});

test('the panel controls are reachable with Tab, in order', async ({ page }) => {
  await openChecklist(page);
  await launcher(page).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => focused(page)).toBe('dialog:Get started');

  const order = [];
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    order.push(await focused(page));
  }
  expect(order).toEqual([
    'button:Collapse checklist',
    expect.stringMatching(/^button:Create a project, completed/),
    expect.stringMatching(/^button:Invite your team, not completed/),
    expect.stringMatching(/^button:Run a report, not completed/),
    'button:Dismiss checklist',
  ]);
});

test('tasks are buttons in a list, with their state and description', async ({ page }) => {
  await openChecklist(page, 'expanded=1');
  const list = page.getByRole('list', { name: 'Tasks' });
  await expect(list.getByRole('listitem')).toHaveCount(3);
  await expect(
    list.getByRole('button', { name: 'Create a project, completed', exact: true }),
  ).toBeVisible();
  const invite = list.getByRole('button', { name: 'Invite your team, not completed', exact: true });
  await expect(invite).toHaveAccessibleDescription('Add people to the project');
});

test('a locked task stays focusable, says why, and does nothing', async ({ page }) => {
  await openChecklist(page, 'expanded=1&ordered=1');
  const report = page.getByRole('button', { name: 'Run a report, not completed', exact: true });
  await expect(report).toHaveAttribute('aria-disabled', 'true');
  await expect(report).toHaveAccessibleDescription('Complete the previous tasks first.');
  await report.focus();
  await page.keyboard.press('Enter');
  expect(await checklistTest(page, 'events.itemClicks')).toEqual([]);
  await expect(panel(page)).toBeVisible();
});

test('the progress bar gives the completed task count', async ({ page }) => {
  await openChecklist(page, 'expanded=1');
  const progress = page.getByRole('progressbar', { name: 'Progress' });
  await expect(progress).toHaveAttribute('aria-valuenow', '33');
  await expect(progress).toHaveAttribute('aria-valuetext', '1 of 3 tasks completed');
});

test('Escape and the collapse button collapse the panel and focus the launcher', async ({
  page,
}) => {
  await openChecklist(page);
  await launcher(page).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => focused(page)).toBe('dialog:Get started');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  await expect(panel(page)).toBeHidden();
  await expect.poll(() => focused(page)).toBe('button:Get started, 2 tasks left');

  await page.keyboard.press('Enter');
  await expect.poll(() => focused(page)).toBe('dialog:Get started');
  await page.keyboard.press('Tab');
  expect(await focused(page)).toBe('button:Collapse checklist');
  await page.keyboard.press('Enter');
  await expect(panel(page)).toBeHidden();
  await expect.poll(() => focused(page)).toBe('button:Get started, 2 tasks left');
});

test('a task that collapses the checklist leaves focus on the launcher', async ({ page }) => {
  await openChecklist(page);
  await launcher(page).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => focused(page)).toBe('dialog:Get started');
  await page.getByRole('button', { name: 'Invite your team, not completed', exact: true }).focus();
  await page.keyboard.press('Enter');
  expect(await checklistTest(page, 'events.itemClicks')).toEqual(['invite']);
  await expect(panel(page)).toBeHidden();
  await expect.poll(() => focused(page)).toBe('button:Get started, 2 tasks left');
});

test('focus returns to the checklist after a tour started from it', async ({ page }) => {
  await openChecklist(page);
  await launcher(page).focus();
  await page.evaluate('window.endTour = window.checklistTest.startTour()');
  await expect.poll(() => focused(page)).toBe('dialog:Step 1 of 1');
  await page.evaluate('window.endTour()');
  expect(await focused(page)).toBe('button:Get started, 2 tasks left');
});

test('Escape on a tour started from a task reopens the checklist on that task', async ({
  page,
}) => {
  await openChecklist(page);
  await launcher(page).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => focused(page)).toBe('dialog:Get started');
  await page.getByRole('button', { name: 'Invite your team, not completed', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(panel(page)).toBeHidden();
  await page.evaluate('window.endTour = window.checklistTest.startTour()');
  await expect.poll(() => focused(page)).toBe('dialog:Step 1 of 1');

  await page.keyboard.press('Escape');
  await expect(panel(page)).toBeVisible();
  await expect.poll(() => focused(page)).toMatch(/^button:Invite your team, not completed/);
});

test('closing a tour started from a task (close button) returns to that task', async ({ page }) => {
  await openChecklist(page);
  await launcher(page).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => focused(page)).toBe('dialog:Get started');
  await page.getByRole('button', { name: 'Run a report, not completed', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(panel(page)).toBeHidden();
  await page.evaluate('window.endTour = window.checklistTest.startTour()');
  await expect.poll(() => focused(page)).toBe('dialog:Step 1 of 1');

  await page.evaluate('window.endTour()');
  await expect(panel(page)).toBeVisible();
  await expect.poll(() => focused(page)).toMatch(/^button:Run a report, not completed/);

  // Only once: a later flow returns to the launcher
  await page.keyboard.press('Escape');
  await expect.poll(() => focused(page)).toBe('button:Get started, 2 tasks left');
  await page.evaluate('window.endTour = window.checklistTest.startTour()');
  await expect.poll(() => focused(page)).toBe('dialog:Step 1 of 1');
  await page.evaluate('window.endTour()');
  await expect.poll(() => focused(page)).toBe('button:Get started, 2 tasks left');
});

test('a tour started from the page returns focus to the page, not the checklist', async ({
  page,
}) => {
  await openChecklist(page);
  await expect(launcher(page)).toBeVisible();
  await page.focus('#page-first');
  await page.evaluate('window.endTour = window.checklistTest.startTour()');
  await expect.poll(() => focused(page)).toBe('dialog:Step 1 of 1');
  await page.evaluate('window.endTour()');
  expect(await focused(page)).toBe('button:First page button');
});

test('an auto-started tour with nothing focused does not end in the checklist', async ({
  page,
}) => {
  await openChecklist(page);
  await expect(launcher(page)).toBeVisible();
  expect(await focused(page)).toBe('body');
  await page.evaluate('window.endTour = window.checklistTest.startTour()');
  await expect.poll(() => focused(page)).toBe('dialog:Step 1 of 1');
  await page.evaluate('window.endTour()');
  await expect(panel(page)).toBeHidden();
  expect(await focused(page)).toBe('body');
});

test('expanding on its own never takes focus from the page', async ({ page }) => {
  await openChecklist(page);
  await expect(launcher(page)).toBeVisible();
  await page.focus('#page-first');
  await checklistTest(page, 'setState({ expanded: true })');
  await expect(panel(page)).toBeVisible();
  await page.waitForTimeout(100);
  expect(await focused(page)).toBe('button:First page button');
});

test('dismiss asks for confirmation with focus on the question; Cancel goes back', async ({
  page,
}) => {
  await openChecklist(page, 'expanded=1');
  const dismiss = page.getByRole('button', { name: 'Dismiss checklist', exact: true });
  await dismiss.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('group', { name: 'Dismiss checklist?' })).toBeVisible();
  expect(await focused(page)).toBe('p:Dismiss checklist?');

  await page.keyboard.press('Tab');
  expect(await focused(page)).toBe('button:Yes, dismiss');
  await page.keyboard.press('Tab');
  expect(await focused(page)).toBe('button:Cancel');
  await page.keyboard.press('Enter');
  await expect.poll(() => focused(page)).toBe('button:Dismiss checklist');

  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  expect(await checklistTest(page, 'events.dismissed')).toBe(1);
  await expect(page.locator('#usertour-bypass-block')).toBeHidden();
  await expect(page.getByRole('link', { name: /Skip to interactive help menu/ })).toHaveCount(0);
});

test('a completed task is announced, expanded or not', async ({ page }) => {
  await openChecklist(page);
  await expect(launcher(page)).toBeVisible();
  const region = page.locator('#usertour-live-region');
  await expect(region).toHaveAttribute('aria-live', 'polite');
  await checklistTest(page, "completeTask('invite')");
  await expect(region).toHaveText('Task completed: Invite your team. 2 of 3 tasks completed');
  await expect(launcher(page, 'Get started, 1 task left')).toBeVisible();
  await checklistTest(page, "completeTask('report')");
  await expect(launcher(page, 'Get started, all tasks completed')).toBeVisible();
});

test('everything is in French on a French page', async ({ page }) => {
  await openChecklist(page, 'lang=fr-CA');
  const button = launcher(page, 'Get started, 2 tâches restantes');
  await expect(button).toBeVisible();

  await page.keyboard.press('Tab');
  expect(await focused(page)).toBe("a:Aller au menu d'aide interactif");
  await expect(page.locator('#usertour-bypass-block')).toBeAttached();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');

  await expect(panel(page)).toHaveAccessibleDescription(
    'Appuyez sur Échap pour réduire la liste de tâches.',
  );
  await expect(panel(page)).toHaveAttribute('lang', 'fr-CA');
  await expect(page.getByRole('button', { name: 'Réduire la liste de tâches' })).toBeVisible();
  const list = page.getByRole('list', { name: 'Tâches' });
  await expect(
    list.getByRole('button', { name: 'Create a project, terminée', exact: true }),
  ).toBeVisible();
  await expect(
    list.getByRole('button', { name: 'Invite your team, non terminée', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Progression' })).toHaveAttribute(
    'aria-valuetext',
    '1 tâche terminée sur 3',
  );

  await page.getByRole('button', { name: 'Masquer la liste de tâches' }).click();
  await expect(page.getByRole('group', { name: 'Masquer la liste de tâches ?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Oui, masquer' })).toBeVisible();
  await page.getByRole('button', { name: 'Annuler' }).click();

  await checklistTest(page, "completeTask('invite')");
  await expect(page.locator('#usertour-live-region')).toHaveText(
    'Tâche terminée : Invite your team. 2 tâches terminées sur 3',
  );
});

test('locked task reason in French', async ({ page }) => {
  await openChecklist(page, 'lang=fr&expanded=1&ordered=1');
  await expect(
    page.getByRole('button', { name: 'Run a report, non terminée', exact: true }),
  ).toHaveAccessibleDescription("Terminez d'abord les tâches précédentes.");
});
