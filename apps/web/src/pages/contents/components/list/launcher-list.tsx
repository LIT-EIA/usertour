import { ContentListSkeleton } from '@/components/molecules/skeleton';
import { useContentListContext } from '@/contexts/content-list-context';
import { PlusCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { Separator } from '@usertour-packages/separator';
import { useRef, useState } from 'react';
import { EmptyPlaceholder } from '../shared/empty-placeholder';
import { LauncherCreateForm } from '../shared/launcher-create-form';
import { DataTable } from './data-table';
import { useAppContext } from '@/contexts/app-context';
import { useTranslation } from 'react-i18next';

export const LauncherListContent = () => {
  const [open, setOpen] = useState(false);
  const { isViewOnly } = useAppContext();
  const { t } = useTranslation();

  const createButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const openCreateFormHandler = async (event: React.MouseEvent<HTMLButtonElement>) => {
    openerRef.current = event.currentTarget;
    setOpen(true);
  };

  // The dialog has no DialogTrigger, so return focus to the button that opened it
  const handleCloseAutoFocus = (event: Event) => {
    event.preventDefault();
    const opener = openerRef.current?.isConnected ? openerRef.current : createButtonRef.current;
    opener?.focus();
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
            <h2 className="text-2xl font-semibold tracking-tight">
              {t('contents.list.launchers.title')}
            </h2>
            <div className="flex flex-row space-x-1">
              <p className="text-sm text-muted-foreground">{t('contents.list.launchers.text')}</p>
            </div>
          </div>
          <Button
            ref={createButtonRef}
            onClick={openCreateFormHandler}
            className="flex-none"
            disabled={isViewOnly}
          >
            <PlusCircledIcon className="mr-2 h-4 w-4" />
            {t('contents.list.newButton', { type: t('contents.types.launcher') })}
          </Button>
        </>
      </div>
      <Separator className="my-6" />
      {isLoading && <ContentListSkeleton count={9} />}
      {!isLoading && contents && contents.length === 0 && (
        <EmptyPlaceholder
          name={t('contents.list.launchers.emptyTitle')}
          description={t('contents.list.launchers.emptyDescription')}
        >
          <Button onClick={openCreateFormHandler} disabled={isViewOnly}>
            <PlusCircledIcon className="mr-2 h-4 w-4" />
            {t('contents.list.newButton', { type: t('contents.types.launcher') })}
          </Button>
        </EmptyPlaceholder>
      )}
      {!isLoading && contents && contents.length > 0 && <DataTable />}
      <LauncherCreateForm
        isOpen={open}
        onClose={handleOnClose}
        onCloseAutoFocus={handleCloseAutoFocus}
      />
    </div>
  );
};

LauncherListContent.displayName = 'LauncherListContent';
