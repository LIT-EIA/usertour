import { document as hostDocument } from '../utils/globals';

const REGION_ID = 'usertour-live-region';
// Lets screen readers notice the cleared region before the new message
const ANNOUNCE_DELAY_MS = 100;

const HIDDEN_STYLE = [
  'position: absolute !important',
  'width: 1px !important',
  'height: 1px !important',
  'margin: -1px !important',
  'padding: 0 !important',
  'overflow: hidden !important',
  'clip: rect(0, 0, 0, 0) !important',
  'white-space: nowrap !important',
  'border: 0 !important',
].join(';');

let region: HTMLElement | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

// Must exist before the first message, or screen readers miss it
export const mountLiveRegion = (): void => {
  const doc = hostDocument;
  if (!doc?.body || region?.isConnected) {
    return;
  }
  region = doc.createElement('div');
  region.id = REGION_ID;
  region.setAttribute('aria-live', 'polite');
  region.setAttribute('aria-atomic', 'true');
  region.style.cssText = HIDDEN_STYLE;
  doc.body.appendChild(region);
};

/** Announces a status message without moving focus (WCAG 4.1.3) */
export const announce = (message: string, lang?: string): void => {
  mountLiveRegion();
  const element = region;
  if (!element) {
    return;
  }
  if (timer) {
    clearTimeout(timer);
  }
  element.textContent = '';
  timer = setTimeout(() => {
    if (lang) {
      element.setAttribute('lang', lang);
    } else {
      element.removeAttribute('lang');
    }
    element.textContent = message;
    timer = null;
  }, ANNOUNCE_DELAY_MS);
};

export const unmountLiveRegion = (): void => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  region?.remove();
  region = null;
};
