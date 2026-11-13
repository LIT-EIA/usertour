import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@usertour/helpers';
import React from 'react';

const ContentActionsPopover = PopoverPrimitive.Root;

const ContentActionsPopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  // Popover only opens on click; make Enter/Space do the same for keyboard users
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.currentTarget.click();
    }
  };
  return (
    <PopoverPrimitive.Trigger ref={ref} asChild {...props}>
      {/* role="button" so the aria-haspopup/aria-expanded set by Radix are allowed, and focusable so
          the action can be edited with the keyboard */}
      {/* biome-ignore lint/a11y/useSemanticElements: children include block elements, which are invalid inside <button> */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className={cn(
          'grow pr-6 text-sm  py-2 w-60 break-words rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          className,
        )}
      >
        {children}
      </div>
    </PopoverPrimitive.Trigger>
  );
});

const ContentActionsPopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'start', sideOffset = 5, children, style, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn('z-50 border bg-popover rounded p-4  w-96', className)}
      style={{
        ...style,
        filter:
          'drop-shadow(0 3px 10px rgba(0, 0, 0, 0.15)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
      }}
      {...props}
    >
      {children}
      <PopoverPrimitive.Arrow className="fill-background" width={20} height={10} />
    </PopoverPrimitive.Content>
  </PopoverPrimitive.Portal>
));

ContentActionsPopoverContent.displayName = 'ContentActionsPopoverContent';

export { ContentActionsPopover, ContentActionsPopoverContent, ContentActionsPopoverTrigger };
