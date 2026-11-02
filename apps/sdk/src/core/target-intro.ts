import { document as hostDocument } from '../utils/globals';
import { TargetType, getTranslations } from './translations';
import { StepFocusManager } from './step-focus-manager';

const focusRules = new StepFocusManager();

const MAX_LABEL_LENGTH = 100;

const ROLE_TYPES: Record<string, TargetType> = {
  button: 'button',
  link: 'link',
  textbox: 'textField',
  searchbox: 'searchField',
  checkbox: 'checkbox',
  radio: 'radio',
  combobox: 'comboBox',
  listbox: 'listBox',
  slider: 'slider',
  switch: 'switch',
  tab: 'tab',
  menuitem: 'menuItem',
  menuitemcheckbox: 'menuItem',
  menuitemradio: 'menuItem',
  img: 'image',
  image: 'image',
  heading: 'heading',
  navigation: 'navigation',
  table: 'table',
  grid: 'table',
  list: 'list',
  form: 'form',
};

const BUTTON_INPUT_TYPES = new Set(['button', 'submit', 'reset', 'image']);

const normalize = (text: string | null | undefined): string =>
  (text ?? '').replace(/\s+/g, ' ').trim();

const truncate = (text: string): string => {
  if (text.length <= MAX_LABEL_LENGTH) {
    return text;
  }
  const cut = text.slice(0, MAX_LABEL_LENGTH);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > MAX_LABEL_LENGTH / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
};

const isFormField = (element: Element): boolean =>
  ['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName);

const getTargetType = (element: Element): { type: TargetType; level?: number } => {
  const role = element.getAttribute('role')?.trim().split(/\s+/)[0]?.toLowerCase();
  if (role && ROLE_TYPES[role]) {
    const type = ROLE_TYPES[role];
    if (type === 'heading') {
      const level = Number.parseInt(element.getAttribute('aria-level') ?? '', 10);
      return { type, level: Number.isNaN(level) ? 2 : level };
    }
    return { type };
  }

  const tag = element.tagName;
  if (/^H[1-6]$/.test(tag)) {
    return { type: 'heading', level: Number(tag[1]) };
  }
  switch (tag) {
    case 'A':
      return { type: element.hasAttribute('href') ? 'link' : 'text' };
    case 'BUTTON':
      return { type: 'button' };
    case 'TEXTAREA':
      return { type: 'textField' };
    case 'SELECT': {
      const select = element as HTMLSelectElement;
      return { type: select.multiple || select.size > 1 ? 'listBox' : 'comboBox' };
    }
    case 'INPUT': {
      const inputType = (element as HTMLInputElement).type;
      if (BUTTON_INPUT_TYPES.has(inputType)) {
        return { type: 'button' };
      }
      if (inputType === 'checkbox') {
        return { type: 'checkbox' };
      }
      if (inputType === 'radio') {
        return { type: 'radio' };
      }
      if (inputType === 'range') {
        return { type: 'slider' };
      }
      if (inputType === 'search') {
        return { type: 'searchField' };
      }
      return { type: 'textField' };
    }
    case 'IMG':
      return { type: 'image' };
    case 'NAV':
      return { type: 'navigation' };
    case 'TABLE':
      return { type: 'table' };
    case 'UL':
    case 'OL':
      return { type: 'list' };
    case 'FORM':
      return { type: 'form' };
  }
  if ((element as HTMLElement).isContentEditable) {
    return { type: 'textField' };
  }
  return { type: normalize((element as HTMLElement).innerText) ? 'text' : 'element' };
};

// Own text is skipped for form fields, where it would be their options
const getTargetLabel = (element: Element): string => {
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const root = element.getRootNode() as Document | ShadowRoot;
    const text = normalize(
      labelledBy
        .split(/\s+/)
        .map((id) => (root.getElementById?.(id) as HTMLElement | null)?.innerText ?? '')
        .join(' '),
    );
    if (text) {
      return text;
    }
  }

  const ariaLabel = normalize(element.getAttribute('aria-label'));
  if (ariaLabel) {
    return ariaLabel;
  }

  const labels = (element as HTMLInputElement).labels;
  if (labels && labels.length > 0) {
    const text = normalize(
      Array.from(labels)
        .map((label) => label.innerText)
        .join(' '),
    );
    if (text) {
      return text;
    }
  }

  if (element.tagName === 'IMG') {
    return normalize(element.getAttribute('alt'));
  }

  if (isFormField(element)) {
    return '';
  }

  return normalize((element as HTMLElement).innerText);
};

export const getElementLabel = (element: Element): string => truncate(getTargetLabel(element));

/**
 * e.g. "Tooltip pointing to button Save."; withTabHint adds how to Tab to the target.
 */
export const getTargetIntro = (
  element: Element,
  doc: Document | undefined = hostDocument,
  withTabHint = true,
): string => {
  const translation = getTranslations(doc).targetIntro;
  const getTypeName = (target: Element) => {
    const { type, level } = getTargetType(target);
    return type === 'heading' ? translation.heading(level ?? 2) : translation.types[type];
  };
  const intro = translation.intro(getTypeName(element), truncate(getTargetLabel(element)));
  const sentence = /[.!?…:]$/.test(intro) ? intro : `${intro}.`;
  if (!withTabHint) {
    return sentence;
  }

  const [tabStop] = focusRules.getTargetTabStops(element);
  return tabStop ? `${sentence} ${translation.tabHint(getTypeName(tabStop))}` : sentence;
};
