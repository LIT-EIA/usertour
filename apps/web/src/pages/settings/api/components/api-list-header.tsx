import { Button } from '@usertour-packages/button';
import { OpenInNewWindowIcon, PlusIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ApiCreateForm } from './api-create-form';
import { useAppContext } from '@/contexts/app-context';

export const ApiListHeader = () => {
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const { environment } = useAppContext();
  const { t } = useTranslation();

  return (
    <div className="relative ">
      <div className="flex flex-col space-y-2">
        <div className="flex flex-row justify-between ">
          <h3 className="text-2xl font-semibold tracking-tight">
            {t('settings.api.title', { environment: environment?.name })}
          </h3>
          <Button variant="default" onClick={() => setIsCreateModalVisible(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            {t('settings.api.newButton')}
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {t('settings.api.headerBody')}
          <br />
          <Trans
            i18nKey="settings.api.headerEnvironment"
            values={{ environment: environment?.name }}
            components={{ strong: <span className="font-bold text-foreground" /> }}
          />
          <br />
          <a
            href="https://docs.usertour.io/api-reference/introduction"
            className="text-primary  "
            target="_blank"
            rel="noreferrer"
          >
            <span>{t('settings.api.headerDocs')}</span>
            <OpenInNewWindowIcon className="size-3.5 inline ml-0.5 mb-0.5" />
          </a>
        </div>
        <ApiCreateForm
          visible={isCreateModalVisible}
          onClose={() => setIsCreateModalVisible(false)}
        />
      </div>
    </div>
  );
};
