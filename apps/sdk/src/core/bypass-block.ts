import { document as hostDocument } from '../utils/globals';
import { focusUsertourWidget, hasFocusTargets, onFocusTargetsChange } from './widget-focus';
import { getTranslations } from './translations';

const HOST_ID = 'usertour-bypass-block';

// Hidden until focused (WCAG 2.4.1)
const STYLE = `
:host {
  all: initial !important;
  display: block !important;
}
:host([hidden]) {
  display: none !important;
}
a {
  position: fixed;
  top: 8px;
  left: 8px;
  z-index: 2147483647;
  padding: 12px 16px;
  border-radius: 4px;
  background: #ffffff;
  color: #1a1a1a;
  font: 600 16px/1.4 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  text-decoration: underline;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  outline: 3px solid #1a1a1a;
  outline-offset: 2px;
}
a:not(:focus) {
  clip-path: inset(50%);
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  white-space: nowrap;
  outline: none;
  box-shadow: none;
}
`;

/** First link of the page; moves focus to the open tour step or checklist */
export class BypassBlock {
  private host: HTMLElement | null = null;
  private link: HTMLAnchorElement | null = null;
  private removeListener: (() => void) | null = null;

  mount(): void {
    const doc = hostDocument;
    if (!doc?.body || this.host) {
      return;
    }
    const host = doc.createElement('div');
    host.id = HOST_ID;
    const root = host.attachShadow({ mode: 'open' });
    const style = doc.createElement('style');
    style.textContent = STYLE;
    const link = doc.createElement('a');
    // A real href so screen readers list it with the page links
    link.href = '#usertour-widget';
    link.addEventListener('click', this.handleClick);
    root.append(style, link);

    this.host = host;
    this.link = link;
    this.update();
    this.removeListener = onFocusTargetsChange(this.update);
  }

  unmount(): void {
    this.removeListener?.();
    this.removeListener = null;
    this.link?.removeEventListener('click', this.handleClick);
    this.host?.remove();
    this.host = null;
    this.link = null;
  }

  private handleClick = (event: MouseEvent): void => {
    event.preventDefault();
    focusUsertourWidget();
  };

  private update = (): void => {
    const { host, link } = this;
    const body = hostDocument?.body;
    if (!host || !link || !body) {
      return;
    }
    const strings = getTranslations();
    link.textContent = strings.bypassBlock;
    if (strings.lang) {
      link.setAttribute('lang', strings.lang);
    } else {
      link.removeAttribute('lang');
    }
    host.hidden = !hasFocusTargets();
    if (body.firstChild !== host) {
      body.prepend(host);
    }
  };
}
