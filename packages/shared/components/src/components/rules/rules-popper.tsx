import * as PopoverPrimitive from '@radix-ui/react-popover';
import { EXTENSION_CONTENT_RULES } from '@usertour-packages/constants';

import { cn } from '@usertour/helpers';
import React, { useContext } from 'react';
import { RulesContext } from './rules-context';

const RulesPopover = PopoverPrimitive.Root;

// Rendered as a div (children contain block content), so expose button semantics and
// keyboard activation explicitly; aria-expanded/aria-haspopup are only valid on such a role.
const RulesPopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  const disabled = useContext(RulesContext)?.disabled ?? false;
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.currentTarget.click();
    }
  };
  return (
    <PopoverPrimitive.Trigger ref={ref} asChild {...props}>
      {/* biome-ignore lint/a11y/useSemanticElements: children include block elements, which are invalid inside <button> */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        onKeyDown={handleKeyDown}
        className={cn(
          'grow pr-6 text-sm  py-2 text-wrap	 break-all rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          className,
        )}
      >
        {children}
      </div>
    </PopoverPrimitive.Trigger>
  );
});
RulesPopoverTrigger.displayName = 'RulesPopoverTrigger';

const RulesPopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(
  (
    {
      className,
      align = 'start',
      sideOffset = 5,
      alignOffset = -32,
      side = 'bottom',
      children,
      ...props
    },
    ref,
  ) => (
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      side={side}
      sideOffset={sideOffset}
      alignOffset={alignOffset}
      className={cn('z-50 border bg-popover rounded p-4  w-96', className)}
      style={{
        zIndex: EXTENSION_CONTENT_RULES,
        filter:
          'drop-shadow(0 3px 10px rgba(0, 0, 0, 0.15)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
      }}
      {...props}
    >
      {children}
      <PopoverPrimitive.Arrow className="fill-background" width={20} height={10} />
    </PopoverPrimitive.Content>
  ),
);

RulesPopoverContent.displayName = 'RulesPopoverContent';

export { RulesPopover, RulesPopoverContent, RulesPopoverTrigger };
