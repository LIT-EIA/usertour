import { SpinnerIcon } from '@usertour-packages/icons';
import { useTranslation } from 'react-i18next';

interface ContentLoadingProps {
  // i18n key of the message; defaults to the generic "Loading..." in the current language
  messageKey?: string;
  className?: string;
}

export function ContentLoading({
  messageKey = 'common.loading',
  className = '',
}: ContentLoadingProps) {
  const { t } = useTranslation();
  return (
    <div className={`flex items-center justify-center min-h-screen ${className}`}>
      {/* <output> has an implicit role="status", so screen readers announce the loading message
          (WCAG 4.1.3) */}
      <output className="flex flex-col items-center space-y-4">
        <SpinnerIcon className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <span className="text-lg text-gray-600">{t(messageKey)}</span>
      </output>
    </div>
  );
}
