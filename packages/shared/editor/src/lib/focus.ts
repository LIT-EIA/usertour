import type { FocusEvent } from 'react';

// React's onBlur bubbles (it is focusout), so a container's onBlur also fires when focus merely
// moves between two of its descendants. Containers that hide controls while "not hovered" must
// only react when focus really leaves them: hiding on every blur removes the very control focus
// is moving to (e.g. Shift+Tab from the formatting toolbar to "Add content block"), focus falls
// back to <body>, and the next Tab/Shift+Tab lands on the same spot again - a keyboard trap.
export const isFocusLeaving = (event: FocusEvent<HTMLElement>) =>
  !event.currentTarget.contains(event.relatedTarget as Node | null);
