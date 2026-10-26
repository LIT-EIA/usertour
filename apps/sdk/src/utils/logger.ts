import { isUndefined } from '@usertour/helpers';
import { window } from './globals';

// Debug output is opt-in through localStorage "debug", using the `debug` npm package convention:
// comma-separated namespaces, `*` as a wildcard, a leading `-` to exclude. Read on every log call,
// so changing it (e.g. from the helper bookmarklet) takes effect without a reload.
//   localStorage.setItem('debug', '*')                         everything
//   localStorage.setItem('debug', 'usertour-widget:*')         all SDK namespaces
//   localStorage.setItem('debug', 'usertour-widget:tour,usertour-widget:focus')
//   localStorage.setItem('debug', 'usertour-widget:*,-usertour-widget:iframe')
const NAMESPACE_PREFIX = 'usertour-widget';

// Keep in sync with DEBUG_NAMESPACES in apps/web/bookmarklet/bookmarklet.js
export type LoggerNamespace =
  | 'app' // SDK init, queue, content loading and scheduling
  | 'content' // content start/end shared by tours, checklists, launchers
  | 'tour' // tour steps, target lookup, close
  | 'focus' // keyboard focus loop for tour steps
  | 'iframe' // host-page iframes: injection, messaging, visibility
  | 'launcher' // launchers and their iframe rendering
  | 'element-watcher' // waiting for target elements to appear
  | 'conditions' // rules, conditional selectors
  | 'navigation' // navigate actions
  | 'visibility'; // element visibility observer

const readDebugSetting = () => {
  try {
    return window?.localStorage?.getItem('debug') || '';
  } catch {
    // Storage blocked (sandboxed iframe, privacy settings)
    return '';
  }
};

const toRegExp = (pattern: string) =>
  new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);

// Patterns are only re-parsed when the stored value changes
let parsedSetting: string | undefined;
let includes: RegExp[] = [];
let excludes: RegExp[] = [];

const isNamespaceEnabled = (name: string) => {
  const setting = readDebugSetting();
  if (setting !== parsedSetting) {
    parsedSetting = setting;
    const patterns = setting.split(/[\s,]+/).filter(Boolean);
    includes = patterns.filter((p) => !p.startsWith('-')).map(toRegExp);
    excludes = patterns.filter((p) => p.startsWith('-')).map((p) => toRegExp(p.slice(1)));
  }
  return !excludes.some((re) => re.test(name)) && includes.some((re) => re.test(name));
};

export const createLogger = (namespace: LoggerNamespace) => {
  const name = `${NAMESPACE_PREFIX}:${namespace}`;
  const prefix = `[${name}]`;
  let lastT: number | undefined;

  const log = (level: 'log' | 'warn' | 'error', ...args: any[]) => {
    if (!isNamespaceEnabled(name) || !window || isUndefined(window.console) || !window.console) {
      return;
    }
    const now = performance.now();
    const t = lastT ? Math.round(now - lastT) : 0;
    lastT = now;
    // A string first argument goes into the styled line; escape % so it isn't read as a format
    const [first, ...rest] = args;
    const message = typeof first === 'string' ? first.replace(/%/g, '%%') : '';
    const extra = typeof first === 'string' ? rest : args;
    // eslint-disable-next-line no-console
    window.console[level](
      `%c${prefix} %c${message} %c+${t}ms`,
      'color:#1FDB7D;',
      '',
      'color:#1FDB7D;',
      ...extra,
    );
  };

  return {
    isEnabled: () => isNamespaceEnabled(name),
    info: (...args: any[]) => log('log', ...args),
    warn: (...args: any[]) => log('warn', ...args),
    error: (...args: any[]) => log('error', ...args),
    // Critical errors are always logged to the console
    critical: (...args: any[]) => {
      // eslint-disable-next-line no-console
      console.error(prefix, ...args);
    },
  };
};

export const logger = {
  ...createLogger('app'),
  uninitializedWarning: (methodName: string) => {
    logger.error(`You must initialize Usertour before calling ${methodName}`);
  },
};
