// Before disabled, hidden and tabindex="-1" checks
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button',
  'input',
  'select',
  'textarea',
  'iframe',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',');

export const canReceiveFocus = (element: Element): boolean => {
  if (!element.isConnected || typeof (element as HTMLElement).focus !== 'function') {
    return false;
  }
  if ((element as HTMLButtonElement).disabled || element.closest('[inert]')) {
    return false;
  }
  if (element.closest('fieldset[disabled]')) {
    return false;
  }
  if (element.getClientRects().length === 0) {
    return false;
  }
  const view = element.ownerDocument.defaultView;
  const style = view?.getComputedStyle(element);
  if (style && (style.visibility === 'hidden' || style.visibility === 'collapse')) {
    return false;
  }
  return true;
};

export const isTabbable = (element: Element): boolean => {
  const tabIndexAttr = element.getAttribute('tabindex');
  if (tabIndexAttr !== null && Number.parseInt(tabIndexAttr, 10) < 0) {
    return false;
  }
  return canReceiveFocus(element);
};

export const getTabbables = (root: Element): Element[] => {
  const candidates = Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR));
  const checkedRadios = new Map<string, Element>();
  for (const element of candidates) {
    const input = element as HTMLInputElement;
    if (element.tagName === 'INPUT' && input.type === 'radio' && input.name && input.checked) {
      checkedRadios.set(input.name, element);
    }
  }
  const seenRadioGroups = new Set<string>();

  return candidates.filter((element) => {
    if (!isTabbable(element)) {
      return false;
    }
    // Native radio groups have a single tab stop
    const input = element as HTMLInputElement;
    if (element.tagName === 'INPUT' && input.type === 'radio' && input.name) {
      const checked = checkedRadios.get(input.name);
      if (checked) {
        return checked === element;
      }
      if (seenRadioGroups.has(input.name)) {
        return false;
      }
      seenRadioGroups.add(input.name);
    }
    return true;
  });
};
