import { ContentListSkeleton } from '@/components/molecules/skeleton';
import { useContentListContext } from '@/contexts/content-list-context';
import { PlusCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { Separator } from '@usertour-packages/separator';
import { useState } from 'react';
import { ChecklistCreateForm } from '../shared/checklist-create-form';
import { EmptyPlaceholder } from '../shared/empty-placeholder';
import { DataTable } from './data-table';
import { useAppContext } from '@/contexts/app-context';
import { useTranslation } from 'react-i18next';

export const ChecklistListContent = () => {
  const [open, setOpen] = useState(false);
  const { isViewOnly } = useAppContext();
  const { t } = useTranslation();

  const openCreateFormHandler = async () => {
    setOpen(true);
  };

  const { contents, refetch, isLoading } = useContentListContext();
  const handleOnClose = async () => {
    setOpen(false);
    refetch();
  };

  return (
    <div className="flex flex-col flex-shrink min-w-0 px-4 py-6 lg:px-8 grow">
      <div className="flex justify-between">
        <>
          <div className="flex flex-col space-y-1 ">
            <h3 className="text-2xl font-semibold tracking-tight">{t('contents.list.checklists.title')}</h3>
            <div className="flex flex-row space-x-1">
              <p className="text-sm text-muted-foreground">
                {t('contents.list.checklists.text')}
              </p>
            </div>
          </div>
          <Button onClick={openCreateFormHandler} className="flex-none" disabled={isViewOnly}>
            <PlusCircledIcon className="mr-2 h-4 w-4" />
            {t('contents.list.newButton', { type: t('contents.types.checklist'), context: 'feminine' })}
          </Button>
        </>
      </div>

      <Separator className="my-6" />
      {isLoading && <ContentListSkeleton count={9} />}
      {!isLoading && contents && contents.length === 0 && (
        <EmptyPlaceholder
          name={t('contents.list.checklists.emptyTitle')}
          description={t('contents.list.checklists.emptyDescription')}
        >
          <Button onClick={openCreateFormHandler} disabled={isViewOnly}>
            <PlusCircledIcon className="mr-2 h-4 w-4" />
            {t('contents.list.newButton', { type: t('contents.types.checklist'), context: 'feminine' })}
          </Button>
        </EmptyPlaceholder>
      )}
      {!isLoading && contents && contents.length > 0 && <DataTable />}

      <ChecklistCreateForm isOpen={open} onClose={handleOnClose} />
    </div>
  );
};

ChecklistListContent.displayName = 'ChecklistListContent';
