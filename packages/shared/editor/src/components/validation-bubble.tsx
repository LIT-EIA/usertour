import * as PopperPrimitive from '@radix-ui/react-popper';

import { cn } from '@usertour/helpers';
import React, { createContext, useContext, useId } from 'react';
import { createPortal } from 'react-dom';

// A validation message pinned next to the field it is about (the red bubble in the builder).
//
// Built on Radix Popper (positioning only) rather than Popover on purpose. The bubble is a passive
// message, not an interactive surface: Popover gave it role="dialog" with no name, moved focus into
// it (it has nothing tabbable) and, while open, injected unlabelled tabindex=0 focus guards at both
// ends of <body>. Popper renders the same bubble with none of that; focus stays where the user was
// and role="alert" announces it.
//
// Usage is unchanged: <Bubble open={...}><BubbleAnchor>field</BubbleAnchor><BubbleContent>...
//
// While open, the anchor carries data-validation-error, so a Save handler that refuses to save can
// call focusFirstValidationError() to take the user to the problem instead of doing nothing.

interface ValidationBubbleContextValue {
  open: boolean;
  contentId: string;
}

const ValidationBubbleContext = createContext<ValidationBubbleContextValue>({
  open: false,
  contentId: '',
});

interface ValidationBubbleProps {
  open?: boolean;
  children?: React.ReactNode;
}

const ValidationBubble = ({ open = false, children }: ValidationBubbleProps) => {
  const contentId = useId();
  return (
    <ValidationBubbleContext.Provider value={{ open, contentId }}>
      <PopperPrimitive.Root>{children}</PopperPrimitive.Root>
    </ValidationBubbleContext.Provider>
  );
};

const ValidationBubbleAnchor = React.forwardRef<
  React.ElementRef<typeof PopperPrimitive.Anchor>,
  React.ComponentPropsWithoutRef<typeof PopperPrimitive.Anchor>
>((props, ref) => {
  const { open, contentId } = useContext(ValidationBubbleContext);
  return (
    <PopperPrimitive.Anchor
      ref={ref}
      data-validation-error={open ? contentId : undefined}
      {...props}
    />
  );
});

ValidationBubbleAnchor.displayName = 'ValidationBubbleAnchor';

const ValidationBubbleContent = React.forwardRef<
  React.ElementRef<typeof PopperPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopperPrimitive.Content>
>(({ className, align = 'center', side = 'right', sideOffset = 5, children, ...props }, ref) => {
  const { open, contentId } = useContext(ValidationBubbleContext);
  if (!open || typeof document === 'undefined') {
    return null;
  }
  return createPortal(
    <PopperPrimitive.Content
      ref={ref}
      id={contentId}
      align={align}
      side={side}
      sideOffset={sideOffset}
      role="alert"
      // red-600: white text >= 4.5:1 (red-500 was 3.8:1, WCAG 1.4.3)
      className={cn('z-50 bg-red-600 text-white rounded-lg p-2 w-48 text-sm', className)}
      {...props}
    >
      {children}
      <PopperPrimitive.Arrow className="fill-red-600" width={10} height={5} />
    </PopperPrimitive.Content>,
    document.body,
  );
});

ValidationBubbleContent.displayName = 'ValidationBubbleContent';

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Moves keyboard focus to the first field that has a validation bubble showing (WCAG 3.3.1).
 *
 * The bubbles usually appear as soon as a field is invalid, so their role="alert" fired long
 * before Save; without this, a refused Save looks and sounds like nothing happened. If the field
 * isn't already described by something, it is pointed at its bubble so a screen reader reads the
 * error on focus.
 *
 * Call it once the bubbles have rendered (e.g. in requestAnimationFrame after setting an error
 * flag). Returns false when no bubble is showing, so the caller can fall back to a message.
 */
const focusFirstValidationError = (root: ParentNode = document): boolean => {
  const anchors = root.querySelectorAll<HTMLElement>('[data-validation-error]');
  for (const anchor of Array.from(anchors)) {
    const target = anchor.matches(FOCUSABLE)
      ? anchor
      : Array.from(anchor.querySelectorAll<HTMLElement>(FOCUSABLE)).find(
          (el) => el.getClientRects().length > 0,
        );
    if (!target) {
      continue;
    }
    const bubbleId = anchor.dataset.validationError;
    if (bubbleId && document.getElementById(bubbleId) && !target.hasAttribute('aria-describedby')) {
      target.setAttribute('aria-describedby', bubbleId);
    }
    target.scrollIntoView({ block: 'nearest' });
    target.focus();
    return true;
  }
  return false;
};

export {
  ValidationBubble,
  ValidationBubbleAnchor,
  ValidationBubbleContent,
  focusFirstValidationError,
};
