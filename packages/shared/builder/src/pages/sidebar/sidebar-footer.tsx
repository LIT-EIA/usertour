import { ExitIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { CheckedIcon, SpinnerIcon } from '@usertour-packages/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { useTranslation } from 'react-i18next';

import { useBuilderContext } from '../../contexts';

export const SidebarFooter = () => {
  const { t } = useTranslation();
  const { saveContent, isLoading, onSaved } = useBuilderContext();
  const handleSaveStep = async () => {
    await saveContent();
    if (onSaved) {
      return await onSaved();
    }
  };

  return (
    <>
      <div className="flex-none relative mr-8 ml-4">
        {/* Announce save progress to screen readers (WCAG 4.1.3 Status Messages) */}
        {/* biome-ignore lint/a11y/useSemanticElements: role=status has broader screen reader support than <output> */}
        <span className="sr-only" role="status">
          {isLoading ? t('contentBuilder.common.saving') : t('contentBuilder.common.saved')}
        </span>
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        {!isLoading && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger type="button" aria-label={t('contentBuilder.common.saved')}>
                <CheckedIcon className="text-green-500" width={20} height={20} aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('contentBuilder.common.saved')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <Button className="grow w-full h-10" onClick={handleSaveStep} disabled={isLoading}>
        <ExitIcon className="mr-2" aria-hidden="true" />
        {t('contentBuilder.common.savePreferences')}
      </Button>
    </>
  );
};
SidebarFooter.displayName = 'SidebarFooter';
