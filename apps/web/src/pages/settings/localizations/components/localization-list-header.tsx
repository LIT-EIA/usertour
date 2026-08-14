import { useLocalizationListContext } from '@/contexts/localization-list-context';
import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LocalizationCreateForm } from './localization-create-form';

export const LocalizationListHeader = () => {
  const [open, setOpen] = useState(false);
  const { refetch } = useLocalizationListContext();
  const { t } = useTranslation();
  const handleCreate = () => {
    setOpen(true);
  };
  const handleOnClose = () => {
    setOpen(false);
    refetch();
  };

  return (
    <>
      <div className="relative ">
        <div className="flex flex-col space-y-2">
          <div className="flex flex-row justify-between ">
            <h3 className="text-2xl font-semibold tracking-tight">{t('settings.localizations.title')}</h3>
            <Button onClick={handleCreate} className="flex-none">
              {t('settings.localizations.newButton')}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>{t('settings.localizations.description')}</p>
            <p>
              <a
                href="https://docs.usertour.io/building-experiences/creating-your-first-flow/"
                className="text-primary  "
                target="_blank"
                rel="noreferrer"
              >
                <span>{t('settings.common.readGuide', { topic: 'Localization' })}</span>
                <OpenInNewWindowIcon className="size-3.5 inline ml-0.5 mb-0.5" />
              </a>
            </p>
          </div>
        </div>
      </div>
      <LocalizationCreateForm isOpen={open} onClose={handleOnClose} />
    </>
  );
};

LocalizationListHeader.displayName = 'LocalizationListHeader';
