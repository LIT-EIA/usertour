'use client';

import { QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

import { cn } from '@usertour/helpers';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md bg-foreground px-3 py-1.5 text-xs text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

interface QuestionTooltipProps {
  children: React.ReactNode;
  /** Accessible name for the help button; defaults to a localized "More information" */
  label?: string;
}

// This package has no i18n dependency; the app keeps <html lang> in sync with the UI language.
const defaultHelpLabel = () =>
  typeof document !== 'undefined' && document.documentElement.lang.startsWith('fr')
    ? "Plus d'information"
    : 'More information';

// The trigger is a native button so the help text is reachable by keyboard and screen readers
// (WCAG 2.1.1, 1.4.13, 4.1.2), not only on mouse hover.
const QuestionTooltip = ({ children, label }: QuestionTooltipProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label ?? defaultHelpLabel()}
          className="inline-flex flex-none items-center justify-center rounded-full align-middle cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <QuestionMarkCircledIcon aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{children}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

QuestionTooltip.displayName = 'QuestionTooltip';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, QuestionTooltip };
