// Focusable Usertour content (tour step, checklist), for the bypass block and focus return
type FocusTarget = {
  // Higher first
  priority: number;
  focus: () => boolean;
  // Defaults to focus() when fromWidget
  returnFocus?: (fromWidget: boolean) => boolean;
};

const targets = new Map<string, FocusTarget>();
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) {
    listener();
  }
};

/** @returns An unregister function */
export const registerFocusTarget = (id: string, target: FocusTarget): (() => void) => {
  targets.set(id, target);
  notify();
  return () => {
    if (targets.get(id) === target) {
      targets.delete(id);
      notify();
    }
  };
};

export const hasFocusTargets = (): boolean => targets.size > 0;

export const focusUsertourWidget = (): boolean => {
  const sorted = [...targets.values()].sort((a, b) => b.priority - a.priority);
  return sorted.some((target) => target.focus());
};

/** @param fromWidget - Focus was in Usertour content when the flow started (else it was lost) */
export const returnFocusToWidget = (fromWidget: boolean): boolean => {
  const sorted = [...targets.values()].sort((a, b) => b.priority - a.priority);
  return sorted.some((target) =>
    target.returnFocus ? target.returnFocus(fromWidget) : fromWidget && target.focus(),
  );
};

export const onFocusTargetsChange = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
