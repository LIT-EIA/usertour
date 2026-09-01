import { ContentListSkeleton } from '@/components/molecules/skeleton';
import { useContentListContext } from '@/contexts/content-list-context';
import { OpenInNewWindowIcon, PlusCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { Separator } from '@usertour-packages/separator';
import { useState } from 'react';
import { ContentCreateForm } from '../shared/content-create-form';
import { EmptyPlaceholder } from '../shared/empty-placeholder';
import { DataTable } from './data-table';
import { useAppContext } from '@/contexts/app-context';
import { useTranslation } from 'react-i18next';

export const FlowListContent = () => {
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
            <h3 className="text-2xl font-semibold tracking-tight">
              {t('contents.list.flows.title')}
            </h3>
            <div className="flex flex-row space-x-1">
              <p className="text-sm text-muted-foreground">
                {t('contents.list.flows.text')} <br />
                <a
                  href="https://docs.usertour.io/building-experiences/creating-your-first-flow/"
                  className="text-primary "
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{t('contents.list.flows.link')}</span>
                  <OpenInNewWindowIcon className="size-3.5 inline ml-0.5 mb-0.5" />
                </a>
              </p>
            </div>
          </div>
          <Button
            onClick={openCreateFormHandler}
            className="flex-none"
            id="create-flow-button"
            disabled={isViewOnly}
          >
            <PlusCircledIcon className="mr-2 h-4 w-4" />
            {t('contents.list.newButton', { type: t('contents.types.flow') })}
          </Button>
        </>
      </div>
      <Separator className="my-6" />
      {isLoading && <ContentListSkeleton count={9} />}
      {!isLoading && contents && contents.length === 0 && (
        <EmptyPlaceholder
          name={t('contents.list.flows.emptyTitle')}
          description={t('contents.list.flows.emptyDescription')}
        >
          <Button onClick={openCreateFormHandler} disabled={isViewOnly}>
            <PlusCircledIcon className="mr-2 h-4 w-4" />
            {t('contents.list.newButton', { type: t('contents.types.flow') })}
          </Button>
        </EmptyPlaceholder>
      )}
      {!isLoading && contents && contents.length > 0 && <DataTable />}
      <ContentCreateForm isOpen={open} onClose={handleOnClose} />
    </div>
  );
};

FlowListContent.displayName = 'FlowListContent';
