import { Side } from '@usertour/types';
import { document } from '../utils/globals';
import { createLogger } from '../utils/logger';

const logger = createLogger('launcher');

/**
 * The launcher renders at the end of the page, so a visually hidden button next to the target
 * gives it the right Tab and reading order. See LAUNCHER_FOCUS_TRAPS.md for page focus traps.
 */
export type LauncherFocusOptions = {
  target: Element;
  side: Side;
  label: string;
  lang?: string;
  hasPopup: boolean;
  expanded: boolean;
  onActivate: () => void;
  onFocusChange: (focused: boolean) => void;
  onEscape: () => void;
};

// Timing of the fix for page scripts that skip the launcher (see handleDocumentFocusIn)
export type LauncherFocusTiming = {
  tabWindowMs: number;
  holdFocusMs: number;
  maxHoldCount: number;
};

export const DEFAULT_LAUNCHER_FOCUS_TIMING: Readonly<LauncherFocusTiming> = {
  tabWindowMs: 100,
  holdFocusMs: 500,
  maxHoldCount: 3,
};

let timing: LauncherFocusTiming = { ...DEFAULT_LAUNCHER_FOCUS_TIMING };

/** For pages whose focus scripts are slower than the defaults; invalid values are ignored */
export const setLauncherFocusTiming = (value: Partial<LauncherFocusTiming>): void => {
  const next = { ...timing };
  for (const key of Object.keys(DEFAULT_LAUNCHER_FOCUS_TIMING) as (keyof LauncherFocusTiming)[]) {
    const number = value[key];
    if (typeof number === 'number' && Number.isFinite(number) && number >= 0) {
      next[key] = number;
    } else if (number !== undefined) {
      logger.warn('setLauncherFocusTiming: ignored invalid', key, number);
    }
  }
  timing = next;
};

export const getLauncherFocusTiming = (): LauncherFocusTiming => ({ ...timing });

// Skips this late after Tab are only logged, to help tune the Tab window
const LATE_SKIP_LOG_MS = 1000;

const BUTTON_ATTRIBUTE = 'data-usertour-launcher-focus';

// Visually hidden; !important against page styles
const BUTTON_STYLE = [
  'all: initial',
  'position: absolute',
  'width: 1px',
  'height: 1px',
  'margin: -1px',
  'padding: 0',
  'border: 0',
  'overflow: hidden',
  'clip-path: inset(50%)',
  'white-space: nowrap',
]
  .map((rule) => `${rule} !important`)
  .join(';');

const isShown = (target: Element): boolean => {
  if (target.getClientRects().length === 0) {
    return false;
  }
  const element = target as Element & {
    checkVisibility?: (options: Record<string, boolean>) => boolean;
  };
  if (element.checkVisibility) {
    return element.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  }
  return target.ownerDocument.defaultView?.getComputedStyle(target).visibility !== 'hidden';
};

export class LauncherFocusProxy {
  private button: HTMLButtonElement;
  private options: LauncherFocusOptions;
  // Re-inserts the button when the page re-renders around the target
  private observer: MutationObserver | null = null;
  // Window capture listeners run before page scripts that may cancel Tab
  private keyTargets: EventTarget[] = [];
  private pendingTab: { from: Element | null; shiftKey: boolean; timer: number } | null = null;
  private lastTab: { from: Element | null; shiftKey: boolean; time: number } | null = null;
  // Page scripts may move focus again a moment later (e.g. Carbon modals), so hold it briefly
  private holdFocus: { until: number; count: number } | null = null;

  constructor(options: LauncherFocusOptions) {
    this.options = options;
    const doc = options.target.ownerDocument;
    // Not in a shadow root: page focus traps use querySelectorAll, which can't see inside
    this.button = doc.createElement('button');
    this.button.type = 'button';
    this.button.setAttribute(BUTTON_ATTRIBUTE, '');
    this.button.setAttribute('style', BUTTON_STYLE);

    this.button.addEventListener('click', this.handleClick);
    this.button.addEventListener('keydown', this.handleKeyDown);
    this.button.addEventListener('focus', this.handleFocus);
    this.button.addEventListener('blur', this.handleBlur);
    this.update(options);
    const parent = options.target.parentNode;
    const view = options.target.ownerDocument.defaultView;
    if (parent && view?.MutationObserver) {
      this.observer = new view.MutationObserver(() => {
        if (this.options.target.isConnected) {
          this.place();
        }
      });
      this.observer.observe(parent, { childList: true });
    }
    this.keyTargets = [
      ...new Set(
        [doc, document]
          .filter((d): d is Document => !!d)
          .map((d): EventTarget => d.defaultView ?? d),
      ),
    ];
    for (const keyTarget of this.keyTargets) {
      keyTarget.addEventListener('keydown', this.handleDocumentKeyDown as EventListener, true);
    }
    doc.addEventListener('focusin', this.handleDocumentFocusIn, true);
    doc.addEventListener('pointerdown', this.handleDocumentPointerDown, true);
  }

  /** A new target needs a new instance */
  update(options: Omit<LauncherFocusOptions, 'target'>) {
    this.options = { ...options, target: this.options.target };
    this.button.setAttribute('aria-label', options.label);
    if (options.lang) {
      this.button.setAttribute('lang', options.lang);
    } else {
      this.button.removeAttribute('lang');
    }
    if (options.hasPopup) {
      this.button.setAttribute('aria-haspopup', 'dialog');
      this.button.setAttribute('aria-expanded', String(options.expanded));
    } else {
      this.button.removeAttribute('aria-haspopup');
      this.button.removeAttribute('aria-expanded');
    }
    this.refresh();
  }

  // Hidden with the target; a target only scrolled out of view keeps it
  private refresh() {
    if (!this.options.target.isConnected) {
      return;
    }
    // Not `hidden`: the inline display from all: initial would win
    if (isShown(this.options.target)) {
      this.button.style.removeProperty('display');
    } else {
      this.button.style.setProperty('display', 'none', 'important');
    }
    this.place();
  }

  private place() {
    const { target, side } = this.options;
    const before = side === 'top' || side === 'left';
    const doc = target.ownerDocument;

    if (target === doc.body || target === doc.documentElement) {
      const body = doc.body;
      if (before ? body.firstChild !== this.button : body.lastChild !== this.button) {
        before ? body.prepend(this.button) : body.append(this.button);
      }
      return;
    }

    if (!target.parentNode) {
      return;
    }
    const sibling = before ? target.previousSibling : target.nextSibling;
    if (sibling === this.button) {
      return;
    }
    // Moving the button would lose its focus
    const focused = this.hasFocus();
    before ? target.before(this.button) : target.after(this.button);
    if (focused) {
      this.focus();
    }
  }

  focus(): boolean {
    if (!this.button.isConnected) {
      return false;
    }
    this.button.focus();
    return this.hasFocus();
  }

  hasFocus(): boolean {
    return (this.button.getRootNode() as Document | ShadowRoot).activeElement === this.button;
  }

  destroy() {
    const focused = this.hasFocus();
    this.button.removeEventListener('click', this.handleClick);
    this.button.removeEventListener('keydown', this.handleKeyDown);
    this.button.removeEventListener('focus', this.handleFocus);
    this.button.removeEventListener('blur', this.handleBlur);
    this.observer?.disconnect();
    this.observer = null;
    for (const keyTarget of this.keyTargets) {
      keyTarget.removeEventListener('keydown', this.handleDocumentKeyDown as EventListener, true);
    }
    this.keyTargets = [];
    this.options.target.ownerDocument.removeEventListener(
      'focusin',
      this.handleDocumentFocusIn,
      true,
    );
    this.options.target.ownerDocument.removeEventListener(
      'pointerdown',
      this.handleDocumentPointerDown,
      true,
    );
    this.holdFocus = null;
    this.lastTab = null;
    this.clearPendingTab();
    this.button.remove();
    if (focused) {
      this.options.onFocusChange(false);
      (this.options.target as HTMLElement).focus?.({ preventScroll: true });
    }
  }

  private handleDocumentKeyDown = (event: KeyboardEvent) => {
    this.holdFocus = null;
    if (event.key === 'Tab') {
      this.refresh();
      const doc = this.options.target.ownerDocument;
      // Even when cancelled: the page then moves focus itself
      if (
        event.currentTarget === (doc.defaultView ?? doc) &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        this.clearPendingTab();
        const view = doc.defaultView ?? window;
        const from = doc.activeElement;
        this.lastTab = { from, shiftKey: event.shiftKey, time: performance.now() };
        this.pendingTab = {
          from,
          shiftKey: event.shiftKey,
          timer: view.setTimeout(() => {
            this.pendingTab = null;
          }, timing.tabWindowMs),
        };
      }
    }
  };

  private clearPendingTab() {
    if (this.pendingTab) {
      (this.options.target.ownerDocument.defaultView ?? window).clearTimeout(this.pendingTab.timer);
      this.pendingTab = null;
    }
  }

  // Some page modals (e.g. Carbon) wrap Tab from a list made before the button existed and skip
  // it; when a Tab skips the button, move focus to it
  private handleDocumentFocusIn = (event: FocusEvent) => {
    const to = event.target as Element | null;
    const button = this.button;
    if (this.holdFocus && to !== button) {
      const hold = this.holdFocus;
      // Never fight a page that keeps taking focus back
      if (performance.now() > hold.until || !this.isTabStop()) {
        this.holdFocus = null;
      } else if (hold.count >= timing.maxHoldCount) {
        this.holdFocus = null;
        logger.warn('page script keeps moving focus off the launcher: stopped putting it back', {
          movedTo: to,
          maxHoldCount: timing.maxHoldCount,
        });
      } else {
        hold.count++;
        logger.info('page script moved focus off the launcher again: put back', {
          movedTo: to,
          count: hold.count,
        });
        Promise.resolve().then(() => {
          if (button.ownerDocument.activeElement === to) {
            this.focus();
          }
        });
        return;
      }
    }
    if (!to || to === button || !this.isTabStop()) {
      return;
    }
    const pending = this.pendingTab;
    if (!pending) {
      this.logLateSkip(to);
      return;
    }
    const { from, shiftKey } = pending;
    if (from === button || !this.skipsButton(from, to, shiftKey)) {
      return;
    }
    this.clearPendingTab();
    this.lastTab = null;
    logger.info('page script skipped the launcher: focus moved to it', { from, to, shiftKey });
    const { target } = this.options;
    // After the page script's handler returns
    Promise.resolve().then(() => {
      const active = target.ownerDocument.activeElement;
      if (active === to || this.inTarget(active)) {
        if (this.focus()) {
          this.holdFocus = { until: performance.now() + timing.holdFocusMs, count: 0 };
        }
      }
    });
  };

  private inTarget(element: Element | null): boolean {
    const { target } = this.options;
    return !!element && (element === target || target.contains(element));
  }

  private skipsButton(from: Element | null, to: Element, shiftKey: boolean): boolean {
    const buttonBefore = this.button.nextSibling === this.options.target;
    const throughButtonIntoTarget = shiftKey ? !buttonBefore : buttonBefore;
    const skippedIntoTarget = throughButtonIntoTarget && this.inTarget(to) && !this.inTarget(from);
    const skippedOutOfTarget =
      !throughButtonIntoTarget && this.inTarget(from) && !this.inTarget(to);
    return skippedIntoTarget || skippedOutOfTarget;
  }

  private logLateSkip(to: Element) {
    const tab = this.lastTab;
    if (!tab || tab.from === this.button) {
      return;
    }
    const elapsed = Math.round(performance.now() - tab.time);
    if (elapsed > LATE_SKIP_LOG_MS || !this.skipsButton(tab.from, to, tab.shiftKey)) {
      return;
    }
    this.lastTab = null;
    logger.warn(
      `page script skipped the launcher ${elapsed} ms after Tab, after the ${timing.tabWindowMs} ms window: not fixed. Raise tabWindowMs with usertour.setLauncherFocusTiming() if this repeats.`,
      { from: tab.from, to, shiftKey: tab.shiftKey },
    );
  }

  private handleDocumentPointerDown = () => {
    this.holdFocus = null;
    this.lastTab = null;
  };

  private isTabStop(): boolean {
    return this.button.isConnected && this.button.style.display !== 'none';
  }

  private handleClick = () => {
    this.options.onActivate();
  };

  private handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' || event.key === 'Esc') {
      if (this.options.hasPopup && this.options.expanded) {
        event.preventDefault();
        event.stopPropagation();
        this.options.onEscape();
      }
    }
  };

  private handleFocus = () => {
    this.options.onFocusChange(true);
  };

  private handleBlur = () => {
    this.options.onFocusChange(false);
  };
}
