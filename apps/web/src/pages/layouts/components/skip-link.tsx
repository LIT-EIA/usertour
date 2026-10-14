import { useTranslation } from 'react-i18next';

export const MAIN_CONTENT_ID = 'main-content';

// Put this attribute on a page's top bar (e.g. the fixed header on detail pages) when it lives
// inside <main>, so the skip link lands on the content after it instead of the bar itself.
export const PAGE_HEADER_ATTR = 'data-page-header';

// The first element after the page's top bar, or <main> itself when the page has no top bar
const getSkipTarget = (): HTMLElement | null => {
  const main = document.getElementById(MAIN_CONTENT_ID);
  if (!main) {
    return null;
  }
  const headers = main.querySelectorAll<HTMLElement>(`[${PAGE_HEADER_ATTR}]`);
  let node: Element | null = headers[headers.length - 1] ?? null;
  while (node && node !== main) {
    // Skip siblings that are not rendered (closed dialogs, display: none)
    for (let next = node.nextElementSibling; next; next = next.nextElementSibling) {
      if (next instanceof HTMLElement && next.getClientRects().length > 0) {
        return next;
      }
    }
    node = node.parentElement;
  }
  return main;
};

// Lets keyboard users bypass the navigation (WCAG 2.4.1 Bypass Blocks); visible only on focus
export const SkipLink = () => {
  const { t } = useTranslation();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = getSkipTarget();
    if (!target) {
      return;
    }
    e.preventDefault();
    // Make a non-interactive target focusable only for this jump, so the next Tab continues
    // from it; drop the temporary tabindex once focus moves on.
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
      target.setAttribute('data-skip-target', '');
      target.addEventListener(
        'blur',
        () => {
          target.removeAttribute('tabindex');
          target.removeAttribute('data-skip-target');
        },
        { once: true },
      );
    }
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start' });
  };

  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[2147483647] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {t('common.skipToContent')}
    </a>
  );
};

SkipLink.displayName = 'SkipLink';
