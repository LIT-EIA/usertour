import { ArrowLeftIcon } from '@radix-ui/react-icons';
import { cn } from '@usertour/helpers';
import { useTranslation } from 'react-i18next';

interface BackButtonProps {
  onClick: () => void;
  className?: string;
  iconClassName?: string;
}

// Keyboard-operable, named replacement for the clickable back-arrow icons (WCAG 2.1.1, 4.1.2)
export const BackButton = ({ onClick, className, iconClassName = 'h-6 w-8' }: BackButtonProps) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('common.back')}
      className={cn(
        'flex-none rounded-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <ArrowLeftIcon className={iconClassName} aria-hidden="true" />
    </button>
  );
};

BackButton.displayName = 'BackButton';
