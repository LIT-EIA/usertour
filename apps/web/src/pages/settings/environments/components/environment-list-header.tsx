import { useAppContext } from '@/contexts/app-context';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { OpenInNewWindowIcon, PlusIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EnvironmentCreateForm } from './environment-create-form';

export const EnvironmentListHeader = () => {
  const { isViewOnly } = useAppContext();
  const [open, setOpen] = useState(false);
  const { refetch } = useEnvironmentListContext();
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
            <h3 className="text-2xl font-semibold tracking-tight">
              {t('settings.environments.title')}
            </h3>
            <Button onClick={handleCreate} className="flex-none" disabled={isViewOnly}>
              <PlusIcon className="w-4 h-4" />
              {t('settings.environments.newButton')}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>{t('settings.environments.description')}</p>
            <p>
              <a
                href="https://docs.usertour.io/how-to-guides/environments/"
                className="text-primary  "
                target="_blank"
                rel="noreferrer"
              >
                <span>{t('settings.common.readGuide', { topic: 'Environments' })}</span>
                <OpenInNewWindowIcon className="size-3.5 inline ml-0.5 mb-0.5" />
              </a>
            </p>
          </div>
        </div>
      </div>
      <EnvironmentCreateForm isOpen={open} onClose={handleOnClose} />
    </>
  );
};

EnvironmentListHeader.displayName = 'EnvironmentListHeader';
