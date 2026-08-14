import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { useState } from 'react';
import { useAppContext } from '@/contexts/app-context';
import { AttributeCreateForm } from '@usertour-packages/shared-editor';
import { PlusIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const AttributeListHeader = () => {
  const [open, setOpen] = useState(false);
  const { refetch } = useAttributeListContext();
  const { isViewOnly, project } = useAppContext();
  const { t } = useTranslation();
  const handleCreate = () => {
    setOpen(true);
  };
  const handleSuccess = () => {
    setOpen(false);
    refetch();
  };

  return (
    <>
      <div className="relative ">
        <div className="flex flex-col space-y-2">
          <div className="flex flex-row justify-between ">
            <h3 className="text-2xl font-semibold tracking-tight">{t('settings.attributes.title')}</h3>
            <Button onClick={handleCreate} disabled={isViewOnly}>
              <PlusIcon className="w-4 h-4" />
              {t('settings.attributes.newButton')}
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>{t('settings.attributes.description')}</p>
            <p>
              <a
                href="https://docs.usertour.io/developers/usertourjs-reference/overview/#attributes"
                className="text-primary  "
                target="_blank"
                rel="noreferrer"
              >
                <span>{t('settings.common.readGuide', { topic: 'Attributes' })}</span>
                <OpenInNewWindowIcon className="size-3.5 inline ml-0.5 mb-0.5" />
              </a>
            </p>
          </div>
        </div>
      </div>
      {project?.id && (
        <AttributeCreateForm
          isOpen={open}
          onOpenChange={setOpen}
          onSuccess={handleSuccess}
          projectId={project?.id}
        />
      )}
    </>
  );
};

AttributeListHeader.displayName = 'AttributeListHeader';
