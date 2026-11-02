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
  '/targets.html': resolve(__dirname, 'fixtures/targets.html'),
  '/harness.js': resolve(__dirname, '../node_modules/.cache/e2e-harness/harness.js'),
};

async function openTargets(page: Page, lang = 'en') {
  await page.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    const file = FILES[path];
    await route.fulfill(
      file
        ? {
            body: readFileSync(file),
            contentType: path.endsWith('.js') ? 'text/javascript' : 'text/html',
          }
        : { status: 404, body: '' },
    );
  });
  await page.goto(`${ORIGIN}/targets.html?lang=${lang}`);
}

const intro = (page: Page, id: string) =>
  page.evaluate(
    (targetId) =>
      (window as any).UsertourFocusTest.getTargetIntro(document.getElementById(targetId), document),
    id,
  );

test.beforeEach(({ isolation }) => {
  test.skip(isolation === 'iframe', 'Covered once, in the shadow projects');
});

const TAB = (type: string) => ` Use Tab to navigate between the tooltip and the ${type}.`;

test('the tooltip intro says the target type and its label', async ({ page }) => {
  await openTargets(page);
  const expected: Record<string, string> = {
    button: `Tooltip pointing to button Save changes.${TAB('button')}`,
    'icon-button': `Tooltip pointing to button Close panel.${TAB('button')}`,
    link: `Tooltip pointing to link Pricing.${TAB('link')}`,
    email: `Tooltip pointing to text field Email address.${TAB('text field')}`,
    agree: `Tooltip pointing to checkbox I agree.${TAB('checkbox')}`,
    search: `Tooltip pointing to search field Search the docs.${TAB('search field')}`,
    labelledby: `Tooltip pointing to text field Full name.${TAB('text field')}`,
    country: `Tooltip pointing to combo box.${TAB('combo box')}`,
    'role-tab': `Tooltip pointing to tab Settings.${TAB('tab')}`,
    logo: 'Tooltip pointing to image Company logo.',
    heading: 'Tooltip pointing to heading level 3 Monthly reports.',
    paragraph: 'Tooltip pointing to text Your data is updated every night.',
    disabled: 'Tooltip pointing to button Upgrade.',
  };
  for (const [id, text] of Object.entries(expected)) {
    expect(await intro(page, id), id).toBe(text);
  }
});

test('a target with a control inside names that control in the Tab sentence', async ({ page }) => {
  await openTargets(page);
  expect(await intro(page, 'wrap')).toBe(
    `Tooltip pointing to text Pick a plan.${TAB('text field')}`,
  );
  expect(await intro(page, 'nav')).toBe(`Tooltip pointing to navigation Main.${TAB('link')}`);
});

test('only the type when there is no label or text', async ({ page }) => {
  await openTargets(page);
  expect(await intro(page, 'empty-button')).toBe(`Tooltip pointing to button.${TAB('button')}`);
  expect(await intro(page, 'unlabelled')).toBe(
    `Tooltip pointing to text field.${TAB('text field')}`,
  );
  expect(await intro(page, 'no-alt')).toBe('Tooltip pointing to image.');
  expect(await intro(page, 'empty-div')).toBe('Tooltip pointing to element.');
});

test('long text targets are cut at a word', async ({ page }) => {
  await openTargets(page);
  const text = await intro(page, 'long');
  expect(text).toMatch(/^Tooltip pointing to text This paragraph is very long .*\S…$/);
  expect(text.length).toBeLessThan(140);
});

test('the tooltip intro is French on a French page', async ({ page }) => {
  await openTargets(page, 'fr-CA');
  const tab = (type: string) => ` Utilisez Tab pour naviguer entre l'infobulle et ${type}.`;
  expect(await intro(page, 'button')).toBe(
    `Infobulle pointant vers le bouton Save changes.${tab('le bouton')}`,
  );
  expect(await intro(page, 'email')).toBe(
    `Infobulle pointant vers le champ de texte Email address.${tab('le champ de texte')}`,
  );
  expect(await intro(page, 'agree')).toBe(
    `Infobulle pointant vers la case à cocher I agree.${tab('la case à cocher')}`,
  );
  expect(await intro(page, 'heading')).toBe(
    'Infobulle pointant vers le titre de niveau 3 Monthly reports.',
  );
  expect(await intro(page, 'no-alt')).toBe("Infobulle pointant vers l'image.");
  expect(await intro(page, 'paragraph')).toBe(
    'Infobulle pointant vers le texte Your data is updated every night.',
  );
});
