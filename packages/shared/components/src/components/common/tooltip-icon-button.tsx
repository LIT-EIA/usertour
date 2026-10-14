import { cn } from '@usertour/helpers';
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';

interface TooltipIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name; defaults to a generic "More information" for help icons */
  label?: string;
}

/**
 * Native button for icon-only tooltip triggers (e.g. help "?" icons).
 * Use as the child of `<TooltipTrigger asChild>` so the tooltip opens on keyboard focus and its text
 * is exposed to screen readers via aria-describedby (WCAG 2.1.1, 1.4.13, 4.1.2).
 */
export const TooltipIconButton = forwardRef<HTMLButtonElement, TooltipIconButtonProps>(
  ({ label, className, children, type = 'button', ...props }, ref) => {
    const { t } = useTranslation();
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label ?? t('common.moreInfo')}
        className={cn(
          'inline-flex flex-none items-center justify-center rounded-full align-middle cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

TooltipIconButton.displayName = 'TooltipIconButton';
