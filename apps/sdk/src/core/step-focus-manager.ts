import { createLogger } from '../utils/logger';
import { document as hostDocument } from '../utils/globals';
import { FOCUSABLE_SELECTOR, canReceiveFocus, getTabbables } from './tabbable';
import { getTourStrings } from './translations';
import { returnFocusToWidget } from './widget-focus';

const logger = createLogger('focus');

// tooltip: target + tooltip controls; modal: modal controls only
export type StepFocusMode = 'tooltip' | 'modal';

export interface StepFocusActivateOptions {
  mode: StepFocusMode;
  // SDK iframe or shadow host
  tooltipHost: HTMLElement;
  // Iframe document or shadow root
  tooltipScope: Document | ShadowRoot;
  tooltipRoot: HTMLElement;
  // Null for modals
  target?: Element | null;
  // Same-origin iframe containing the target
  targetIframe?: HTMLIFrameElement | null;
  // Target stays in the loop but acts disabled
  blockTarget?: boolean;
  inertPage?: boolean;
  // e.g. "Step 2 of 5"
  label: string;
  targetHint: string;
  lang?: string;
  zIndex: number;
  onEscape: () => void;
}

type ListenerRecord = {
  target: EventTarget;
  type: string;
  handler: EventListener;
};

type SavedAttributes = Map<string, string | null>;

const NATIVE_ARROW_ROLES = new Set([
  'combobox',
  'grid',
  'gridcell',
  'listbox',
  'menu',
  'menubar',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'radiogroup',
  'searchbox',
  'slider',
  'spinbutton',
  'tab',
  'tablist',
  'textbox',
  'tree',
  'treegrid',
  'treeitem',
]);

const NON_ARROW_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'image',
  'reset',
  'submit',
]);

const INTERACTIVE_ROLES = new Set([
  'button',
  'checkbox',
  'combobox',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'searchbox',
  'slider',
  'spinbutton',
  'switch',
  'tab',
  'textbox',
  'treeitem',
]);

const TARGET_ATTRIBUTES = ['tabindex', 'aria-describedby', 'aria-disabled'];

const RESTORE_LIMIT = 5; // Max pull-backs per window before giving up
const RESTORE_WINDOW_MS = 1000;
const POINTER_FOCUS_WINDOW_MS = 1000;

const VISUALLY_HIDDEN_STYLE =
  'position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important;';

let descriptionIdCounter = 0;

// Firefox only focuses the iframe, not the element, unless the iframe's window has focus
const focusAcrossDocuments = (element: Element, options?: FocusOptions): void => {
  const doc = element.ownerDocument;
  if (doc !== hostDocument && !doc.hasFocus()) {
    doc.defaultView?.focus();
  }
  (element as HTMLElement).focus(options);
};

// Virtual elements stand in for targets inside iframes and can't take focus
export const isVirtualElement = (element: Element): boolean =>
  Boolean((element as Element & { __usertour_virtual_iframe?: boolean }).__usertour_virtual_iframe);

/**
 * Keeps keyboard focus cycling through the active step (WCAG 2.4.3); Escape closes the flow.
 */
export class StepFocusManager {
  private options: StepFocusActivateOptions | null = null;
  private listeners: ListenerRecord[] = [];
  private targetListeners: ListenerRecord[] = [];
  private savedTargetAttributes: SavedAttributes | null = null;
  private descriptionNode: HTMLElement | null = null;
  private inertRestore: Array<{
    element: Element;
    inert: string | null;
    ariaHidden: string | null;
  }> = [];
  private ringElement: HTMLElement | null = null;
  private ringFrame: number | null = null;
  private initialFocusFrame: number | null = null;
  private lastFocused: Element | null = null;
  private isRestoringFocus = false;
  private restoreAttempts: number[] = [];
  private guardDisabled = false;
  private lastPointerDownAt = 0;
  // Focus left via the mouse: don't pull it back until it returns
  private focusEscaped = false;
  // Kept across steps of the same flow
  private previousFocus: Element | null = null;
  private startedFromWidget = false;
  private startedWithoutFocus = false;
  private flowStarted = false;
  private lastTarget: Element | null = null;
  private lastTargetWasFocusable = false;
  private targetInLoop = false;

  activate(options: StepFocusActivateOptions): void {
    if (this.options?.tooltipRoot === options.tooltipRoot) {
      return;
    }
    const resumeWithoutFocus = this.focusEscaped && this.isFocusOutsideTour();
    this.suspend();

    if (!this.previousFocus) {
      const active = this.getHostActiveElement();
      const inWidget = Boolean(active?.closest('#usertour-widget'));
      this.previousFocus = inWidget ? null : active;
      if (!this.flowStarted) {
        this.startedFromWidget = inWidget;
        this.startedWithoutFocus = !active;
      }
    }
    this.flowStarted = true;

    this.options = options;
    this.guardDisabled = false;
    this.restoreAttempts = [];
    this.focusEscaped = resumeWithoutFocus;

    this.applyDialogLabel();
    // Shadow root events reach the page document; iframe events don't
    if (options.tooltipScope.nodeType === Node.DOCUMENT_NODE) {
      this.addDocumentListeners(options.tooltipScope as Document);
    }
    if (hostDocument) {
      this.addDocumentListeners(hostDocument);
    }

    if (options.mode === 'modal') {
      if (options.inertPage) {
        this.hideHostPage();
      }
    } else {
      this.attachTarget(options.target ?? null, options.targetIframe ?? null);
    }

    logger.info('activated', options.mode, options.label);

    if (!resumeWithoutFocus) {
      this.scheduleInitialFocus();
    }
  }

  /** Swaps the target when it re-renders */
  retarget(target: Element | null, targetIframe: HTMLIFrameElement | null = null): void {
    const options = this.options;
    if (!options || options.mode !== 'tooltip') {
      return;
    }
    if (options.target === target && (options.targetIframe ?? null) === targetIframe) {
      return;
    }
    const focusWasOnOldTarget = this.isInTargetZone(this.lastFocused);
    this.detachTarget();
    options.target = target;
    options.targetIframe = targetIframe;
    this.attachTarget(target, targetIframe);
    if (focusWasOnOldTarget && !this.focusEscaped) {
      this.focusElement(this.getTargetItems()[0] ?? options.tooltipRoot);
    }
  }

  /** Removes listeners and attributes but keeps the focus restoration point */
  suspend(tooltipRoot?: HTMLElement): void {
    if (!this.options) {
      return;
    }
    if (tooltipRoot && this.options.tooltipRoot !== tooltipRoot) {
      return;
    }
    this.cancelInitialFocus();
    this.removeListeners(this.listeners);
    this.listeners = [];
    this.detachTarget();
    this.restoreHostPage();
    this.options = null;
    this.lastFocused = null;
    this.isRestoringFocus = false;
    logger.info('suspended');
  }

  destroy(restoreFocus = true): void {
    const shouldRestore = restoreFocus && !this.isFocusOutsideTour();
    const lastTarget = this.lastTarget;
    const lastTargetWasFocusable = this.lastTargetWasFocusable;
    const previousFocus = this.previousFocus;
    const startedFromWidget = this.startedFromWidget;
    const startedWithoutFocus = this.startedWithoutFocus;

    this.suspend();
    this.previousFocus = null;
    this.startedFromWidget = false;
    this.startedWithoutFocus = false;
    this.flowStarted = false;
    this.lastTarget = null;
    this.lastTargetWasFocusable = false;
    this.focusEscaped = false;

    if (!shouldRestore) {
      return;
    }
    // Return focus to the checklist task that started the flow
    if ((startedFromWidget || startedWithoutFocus) && returnFocusToWidget(startedFromWidget)) {
      return;
    }
    const candidates = [lastTargetWasFocusable ? lastTarget : null, previousFocus];
    for (const candidate of candidates) {
      if (candidate && canReceiveFocus(candidate)) {
        focusAcrossDocuments(candidate, { preventScroll: true });
        return;
      }
    }
  }

  isActive(): boolean {
    return this.options !== null;
  }

  private attachTarget(target: Element | null, targetIframe: HTMLIFrameElement | null): void {
    const options = this.options;
    if (!options) {
      return;
    }
    if (!target) {
      if (targetIframe) {
        logger.warn('Target iframe is not accessible, focus loop skips the target');
      }
      return;
    }
    if (isVirtualElement(target)) {
      logger.warn('Virtual target element ignored');
      return;
    }

    const targetDoc = target.ownerDocument;
    this.lastTarget = target;
    this.lastTargetWasFocusable = this.isNativelyFocusable(target);
    this.targetInLoop = this.isInteractive(target);

    if (targetDoc !== hostDocument) {
      this.addDocumentListeners(targetDoc, this.targetListeners);
    }
    if (options.blockTarget) {
      this.listen(targetDoc, 'click', this.handleBlockedClick, this.targetListeners);
    }
    // Non-interactive targets stay out of the tab order (their controls still join the loop)
    if (!this.targetInLoop) {
      return;
    }

    const saved: SavedAttributes = new Map();
    for (const name of TARGET_ATTRIBUTES) {
      saved.set(name, target.getAttribute(name));
    }
    this.savedTargetAttributes = saved;

    // e.g. <div role="button"> can't take focus on its own
    if (!this.lastTargetWasFocusable) {
      target.setAttribute('tabindex', '-1');
    }
    if (options.blockTarget) {
      target.setAttribute('aria-disabled', 'true');
    }

    // IDREFs can't cross documents
    const description = targetDoc.createElement('span');
    descriptionIdCounter += 1;
    description.id = `usertour-step-description-${descriptionIdCounter}`;
    description.setAttribute('style', VISUALLY_HIDDEN_STYLE);
    if (options.lang) {
      description.setAttribute('lang', options.lang);
    }
    description.textContent = `${this.getFullLabel()}. ${options.targetHint}`;
    targetDoc.body?.appendChild(description);
    this.descriptionNode = description;
    const describedBy = saved.get('aria-describedby');
    target.setAttribute(
      'aria-describedby',
      describedBy ? `${describedBy} ${description.id}` : description.id,
    );
  }

  private detachTarget(): void {
    this.removeListeners(this.targetListeners);
    this.targetListeners = [];
    this.hideRing();

    const target = this.options?.target;
    if (target && this.savedTargetAttributes) {
      for (const [name, value] of this.savedTargetAttributes) {
        if (value === null) {
          target.removeAttribute(name);
        } else {
          target.setAttribute(name, value);
        }
      }
    }
    this.savedTargetAttributes = null;
    this.targetInLoop = false;
    this.descriptionNode?.remove();
    this.descriptionNode = null;
  }

  private handleBlockedClick = (event: Event): void => {
    if (this.isInTargetZone(event.target as Element)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  private hideHostPage(): void {
    const body = hostDocument?.body;
    if (!body) {
      return;
    }
    const supportsInert = 'inert' in HTMLElement.prototype;
    for (const child of Array.from(body.children)) {
      if (
        child.id === 'usertour-widget' ||
        ['SCRIPT', 'STYLE', 'LINK', 'TEMPLATE', 'NOSCRIPT'].includes(child.tagName)
      ) {
        continue;
      }
      this.inertRestore.push({
        element: child,
        inert: child.getAttribute('inert'),
        ariaHidden: child.getAttribute('aria-hidden'),
      });
      if (supportsInert) {
        child.setAttribute('inert', '');
      } else {
        child.setAttribute('aria-hidden', 'true');
      }
    }
  }

  private restoreHostPage(): void {
    for (const { element, inert, ariaHidden } of this.inertRestore) {
      if (inert === null) {
        element.removeAttribute('inert');
      } else {
        element.setAttribute('inert', inert);
      }
      if (ariaHidden === null) {
        element.removeAttribute('aria-hidden');
      } else {
        element.setAttribute('aria-hidden', ariaHidden);
      }
    }
    this.inertRestore = [];
  }

  private addDocumentListeners(doc: Document, records: ListenerRecord[] = this.listeners): void {
    this.listen(doc, 'keydown', this.handleKeyDown, records);
    this.listen(doc, 'focusin', this.handleFocusIn, records);
    this.listen(doc, 'pointerdown', this.handlePointerDown, records);
  }

  private listen<E extends Event>(
    target: EventTarget,
    type: string,
    handler: (event: E) => void,
    records: ListenerRecord[],
  ): void {
    target.addEventListener(type, handler as EventListener, true);
    records.push({ target, type, handler: handler as EventListener });
  }

  private removeListeners(records: ListenerRecord[]): void {
    for (const { target, type, handler } of records) {
      target.removeEventListener(type, handler, true);
    }
  }

  private handlePointerDown = (): void => {
    this.lastPointerDownAt = Date.now();
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    const options = this.options;
    if (!options || event.defaultPrevented || event.isComposing) {
      return;
    }
    const eventTarget = this.getEventElement(event);
    const element = eventTarget === options.tooltipHost ? options.tooltipRoot : eventTarget;
    const zone = this.getZone(element);
    if (!element || !zone) {
      return;
    }

    const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

    switch (event.key) {
      case 'Escape':
      case 'Esc': {
        // Let expanded popups (select, combobox) close first
        if (element.getAttribute('aria-expanded') === 'true') {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        options.onEscape();
        return;
      }
      case 'Tab': {
        if (hasModifier) {
          return;
        }
        this.moveFocus(event, element, zone, event.shiftKey ? -1 : 1);
        return;
      }
      case 'ArrowDown':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowLeft': {
        if (hasModifier || event.shiftKey || this.usesArrowKeys(element)) {
          return;
        }
        // On content text, arrows belong to the screen reader
        if (!this.isLoopItem(element)) {
          logger.info('arrow key left to the reader', event.key, element);
          return;
        }
        const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
        this.moveFocus(event, element, zone, direction);
        return;
      }
      case 'Enter':
      case ' ':
      case 'Spacebar': {
        if (options.blockTarget && zone === 'target') {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        return;
      }
    }
  };

  private handleFocusIn = (event: FocusEvent): void => {
    const options = this.options;
    const element = this.getEventElement(event);
    if (!options || !element || this.isRestoringFocus) {
      return;
    }

    if (this.isInLoop(element)) {
      this.focusEscaped = false;
      // The element inside the iframe reports itself
      if (element !== options.tooltipHost && element !== options.targetIframe) {
        this.lastFocused = element;
      }
      if (this.isInTargetZone(element)) {
        this.showRing();
      } else if (this.isInTooltip(element)) {
        this.hideRing();
      }
      return;
    }

    this.hideRing();
    if (this.focusEscaped || Date.now() - this.lastPointerDownAt < POINTER_FOCUS_WINDOW_MS) {
      // Moved with the mouse: don't fight it
      this.focusEscaped = true;
      return;
    }
    this.pullFocusBack();
  };

  private pullFocusBack(): void {
    const options = this.options;
    if (!options || this.guardDisabled) {
      return;
    }
    const now = Date.now();
    this.restoreAttempts = this.restoreAttempts.filter((t) => now - t < RESTORE_WINDOW_MS);
    this.restoreAttempts.push(now);
    if (this.restoreAttempts.length > RESTORE_LIMIT) {
      this.guardDisabled = true;
      logger.warn(
        'Host page keeps moving focus away from the tour step; focus guard paused for this step',
      );
      return;
    }

    let next: Element | null = this.lastFocused;
    if (
      next &&
      next.tagName === 'IFRAME' &&
      this.isInTooltip(next) &&
      next !== options.tooltipHost
    ) {
      next = this.getRelativeItem(next, 'tooltip', 1);
    }
    if (!next || !canReceiveFocus(next) || !this.isInLoop(next)) {
      next = options.tooltipRoot;
    }
    this.focusElement(next);
  }

  private moveFocus(
    event: KeyboardEvent,
    element: Element,
    zone: 'target' | 'tooltip',
    direction: 1 | -1,
  ): void {
    const next = this.getRelativeItem(element, zone, direction);
    event.preventDefault();
    event.stopPropagation();
    if (next && next !== element) {
      this.focusElement(next);
    }
  }

  private getRelativeItem(
    element: Element,
    zone: 'target' | 'tooltip',
    direction: 1 | -1,
  ): Element | null {
    const targetItems = this.getTargetItems();
    const tooltipItems = this.getTooltipItems();
    const items = [...targetItems, ...tooltipItems];
    if (items.length === 0) {
      return this.options?.tooltipRoot ?? null;
    }

    const index = items.indexOf(element);
    if (index !== -1) {
      return items[(index + direction + items.length) % items.length];
    }

    // Not a tab stop (e.g. the container): find its position in the loop
    const zoneItems = zone === 'target' ? targetItems : tooltipItems;
    const before = zoneItems.filter((item) => this.precedes(item, element)).length;
    const position = (zone === 'target' ? 0 : targetItems.length) + before;
    const nextIndex = direction === 1 ? position : position - 1;
    return items[(nextIndex + items.length) % items.length];
  }

  private getTargetItems(): Element[] {
    const target = this.options?.mode === 'tooltip' ? this.options.target : null;
    if (!target || !target.isConnected || isVirtualElement(target)) {
      return [];
    }
    return this.collectTargetTabStops(target, this.targetInLoop);
  }

  /** Tab stops a target would add to the loop */
  getTargetTabStops(target: Element): Element[] {
    if (!target.isConnected || isVirtualElement(target)) {
      return [];
    }
    return this.collectTargetTabStops(target, this.isInteractive(target));
  }

  private collectTargetTabStops(target: Element, targetInLoop: boolean): Element[] {
    const items: Element[] = [];
    if (targetInLoop && canReceiveFocus(target)) {
      items.push(target);
    }
    for (const element of getTabbables(target)) {
      if (element !== target) {
        items.push(element);
      }
    }
    return items;
  }

  private isLoopItem(element: Element): boolean {
    return this.getTargetItems().includes(element) || this.getTooltipItems().includes(element);
  }

  private getTooltipItems(): Element[] {
    const root = this.options?.tooltipRoot;
    return root ? getTabbables(root) : [];
  }

  private isNativelyFocusable(element: Element): boolean {
    return element.matches(FOCUSABLE_SELECTOR) && !(element as HTMLButtonElement).disabled;
  }

  private isInteractive(element: Element): boolean {
    if ((element as HTMLButtonElement).disabled) {
      return false;
    }
    const tabIndex = Number.parseInt(element.getAttribute('tabindex') ?? '', 10);
    if (!Number.isNaN(tabIndex)) {
      return tabIndex >= 0;
    }
    if (element.matches(FOCUSABLE_SELECTOR)) {
      return true;
    }
    const role = element.getAttribute('role')?.trim().split(/\s+/)[0];
    return Boolean(role && INTERACTIVE_ROLES.has(role));
  }

  private usesArrowKeys(element: Element): boolean {
    const tagName = element.tagName;
    if (tagName === 'TEXTAREA' || tagName === 'SELECT') {
      return true;
    }
    if (tagName === 'INPUT') {
      return !NON_ARROW_INPUT_TYPES.has((element as HTMLInputElement).type);
    }
    if ((element as HTMLElement).isContentEditable) {
      return true;
    }
    let current: Element | null = element;
    while (current) {
      const role = current.getAttribute('role');
      if (role && NATIVE_ARROW_ROLES.has(role)) {
        return true;
      }
      if (current === this.options?.tooltipRoot) {
        break;
      }
      current = current.parentElement;
    }
    return false;
  }

  private precedes(a: Element, b: Element): boolean {
    if (a === b || a.contains(b)) {
      return false;
    }
    return Boolean(b.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_PRECEDING);
  }

  private getZone(element: Element | null): 'target' | 'tooltip' | null {
    if (!element || !this.options) {
      return null;
    }
    if (this.isInTooltip(element)) {
      return 'tooltip';
    }
    if (this.isInTargetZone(element)) {
      return 'target';
    }
    return null;
  }

  private isInTooltip(element: Element): boolean {
    const options = this.options;
    if (!options) {
      return false;
    }
    if (element === options.tooltipHost) {
      return true;
    }
    const scope = options.tooltipScope;
    return scope.nodeType === Node.DOCUMENT_NODE
      ? element.ownerDocument === scope
      : element.getRootNode() === scope;
  }

  // Shadow root events are retargeted to the host at page level
  private getEventElement(event: Event): Element | null {
    const target = event.target as Element | null;
    if (!target || target !== this.options?.tooltipHost) {
      return target;
    }
    const inner = event.composedPath()[0] as Node | undefined;
    return inner && inner !== target && inner.nodeType === Node.ELEMENT_NODE
      ? (inner as Element)
      : target;
  }

  private isInTargetZone(element: Element | null): boolean {
    const target = this.options?.mode === 'tooltip' ? this.options.target : null;
    return Boolean(element && target && (target === element || target.contains(element)));
  }

  private isInLoop(element: Element): boolean {
    const options = this.options;
    if (!options) {
      return false;
    }
    if (this.isInTooltip(element)) {
      return true;
    }
    if (options.targetIframe && element === options.targetIframe) {
      return true;
    }
    return this.isInTargetZone(element);
  }

  private isFocusOutsideTour(): boolean {
    const active = this.getHostActiveElement();
    if (!active) {
      return false;
    }
    if (active.closest('#usertour-widget')) {
      return false;
    }
    if (this.lastTarget && (this.lastTarget === active || this.lastTarget.contains(active))) {
      return false;
    }
    if (this.lastTarget && active.tagName === 'IFRAME') {
      const iframeDoc = this.getIframeDocument(active as HTMLIFrameElement);
      if (iframeDoc && iframeDoc === this.lastTarget.ownerDocument) {
        return false;
      }
    }
    return true;
  }

  private getHostActiveElement(): Element | null {
    const active = hostDocument?.activeElement ?? null;
    if (!active || active === hostDocument?.body || active === hostDocument?.documentElement) {
      return null;
    }
    return active;
  }

  private getIframeDocument(iframe: HTMLIFrameElement): Document | null {
    try {
      return iframe.contentDocument;
    } catch {
      return null;
    }
  }

  private focusElement(element: Element): void {
    const options = this.options;
    this.isRestoringFocus = true;
    try {
      focusAcrossDocuments(element);
    } finally {
      this.isRestoringFocus = false;
    }
    if (this.isInLoop(element)) {
      this.lastFocused = element;
      this.focusEscaped = false;
      if (this.isInTargetZone(element)) {
        this.showRing();
      } else if (options) {
        this.hideRing();
      }
    }
  }

  private scheduleInitialFocus(): void {
    const view = hostDocument?.defaultView;
    if (!view) {
      return;
    }
    const root = this.options?.tooltipRoot;
    if (!root) {
      return;
    }
    // Focus the dialog itself so screen readers read it from the top.
    // Wait two frames: the popper stays hidden until its own effect runs.
    this.initialFocusFrame = view.requestAnimationFrame(() => {
      this.initialFocusFrame = view.requestAnimationFrame(() => {
        this.initialFocusFrame = null;
        if (this.options?.tooltipRoot === root && !this.focusEscaped) {
          this.focusElement(root);
        }
      });
    });
  }

  private cancelInitialFocus(): void {
    if (this.initialFocusFrame !== null) {
      hostDocument?.defaultView?.cancelAnimationFrame(this.initialFocusFrame);
      this.initialFocusFrame = null;
    }
  }

  private getFullLabel(): string {
    const options = this.options;
    if (!options) {
      return '';
    }
    const heading = options.tooltipRoot
      .querySelector('h1, h2, h3, h4, h5, h6')
      ?.textContent?.trim();
    return heading ? getTourStrings().stepWithHeading(options.label, heading) : options.label;
  }

  private applyDialogLabel(): void {
    const root = this.options?.tooltipRoot;
    if (root?.getAttribute('role') === 'dialog') {
      root.setAttribute('aria-label', this.getFullLabel());
    }
  }

  // Drawn by the SDK because host CSS may remove outlines
  private showRing(): void {
    const options = this.options;
    const target = options?.target;
    if (!options || !target || !hostDocument?.body || this.ringElement) {
      return;
    }
    const ring = hostDocument.createElement('div');
    ring.setAttribute('aria-hidden', 'true');
    ring.setAttribute('data-usertour-focus-ring', '');
    ring.style.cssText = [
      'position: fixed',
      'pointer-events: none',
      'box-sizing: border-box',
      'border-radius: 4px',
      // Two rings: 3:1 contrast on any background
      'box-shadow: 0 0 0 2px #ffffff, 0 0 0 4px #1a1a1a',
      `z-index: ${options.zIndex}`,
    ].join(';');
    hostDocument.body.appendChild(ring);
    this.ringElement = ring;
    this.updateRing();
  }

  private updateRing = (): void => {
    const ring = this.ringElement;
    const options = this.options;
    const view = hostDocument?.defaultView;
    if (!ring || !options?.target || !view) {
      return;
    }
    const rect = options.target.getBoundingClientRect();
    let left = rect.left;
    let top = rect.top;
    if (options.targetIframe) {
      const iframeRect = options.targetIframe.getBoundingClientRect();
      left += iframeRect.left + options.targetIframe.clientLeft;
      top += iframeRect.top + options.targetIframe.clientTop;
    }
    const offset = 2;
    ring.style.left = `${left - offset}px`;
    ring.style.top = `${top - offset}px`;
    ring.style.width = `${rect.width + offset * 2}px`;
    ring.style.height = `${rect.height + offset * 2}px`;
    this.ringFrame = view.requestAnimationFrame(this.updateRing);
  };

  private hideRing(): void {
    if (this.ringFrame !== null) {
      hostDocument?.defaultView?.cancelAnimationFrame(this.ringFrame);
      this.ringFrame = null;
    }
    this.ringElement?.remove();
    this.ringElement = null;
  }
}
