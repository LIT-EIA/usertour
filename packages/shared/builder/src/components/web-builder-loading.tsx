import { SpinnerIcon } from '@usertour-packages/icons';
import { useTranslation } from 'react-i18next';

interface WebBuilderLoadingProps {
  message?: string;
  className?: string;
}

export function WebBuilderLoading({ message, className = '' }: WebBuilderLoadingProps) {
  const { t } = useTranslation();
  const displayMessage = message ?? t('contentBuilder.loadingBuilder');
  return (
    <div className={`flex items-center justify-center min-h-screen ${className}`}>
      <div className="flex flex-col items-center space-y-4">
        <SpinnerIcon className="h-8 w-8 animate-spin text-primary" />
        {displayMessage && <div className="text-lg text-gray-600">{displayMessage}</div>}
      </div>
    </div>
  );
}
