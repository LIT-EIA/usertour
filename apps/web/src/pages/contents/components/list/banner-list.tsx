import { ContentListSkeleton } from '@/components/molecules/skeleton';
import { useContentListContext } from '@/contexts/content-list-context';
import { PlusCircledIcon } from '@radix-ui/react-icons';
import { isInstalledExtension } from '@usertour-packages/builder';
import { Button } from '@usertour-packages/button';
import { Separator } from '@usertour-packages/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@usertour-packages/tabs';
import { useState } from 'react';
import { BannerCreateForm } from '../shared/banner-create-form';
import { EmptyPlaceholder } from '../shared/empty-placeholder';
import { ExtensionInstallDialog } from '../shared/extension-install-dialog';
import { DataTable } from './data-table';
import { useAppContext } from '@/contexts/app-context';
import { useTranslation } from 'react-i18next';

export const BannerListContent = () => {
  const [open, setOpen] = useState(false);
  const [isOpenedInstall, setIsOpenedInstall] = useState(false);
  const { isViewOnly } = useAppContext();
  const { t } = useTranslation();

  const openCreateFormHandler = async () => {
    const isInstalled = await isInstalledExtension();
    if (!isInstalled) {
      setIsOpenedInstall(true);
    } else {
      setOpen(true);
    }
  };

  const { contents, refetch, setQuery, isLoading } = useContentListContext();
  const handleOnClose = async () => {
    setOpen(false);
    refetch();
  };

  const handleOnValueChange = async (value: string) => {
    if (value === 'published') {
      setQuery({ published: true });
    } else {
      setQuery({});
    }
  };

  const handleOnInstalled = () => {
    setIsOpenedInstall(false);
    setOpen(true);
  };

  return (
    <div className="h-full px-4 py-6 lg:px-8 lg:border-l shadow bg-white rounded-lg grow">
      <div className="flex items-center justify-between">
        <div className="flex flex-col space-y-1 ">
          <h3 className="text-2xl font-semibold tracking-tight">{t('contents.list.banners.title')}</h3>
          <div className="flex flex-row space-x-1">
            <p className="text-sm text-muted-foreground">{t('contents.list.banners.text')}</p>
          </div>
        </div>
      </div>
      <Separator className="my-4" />
      <Tabs defaultValue="all" className="h-full space-y-6" onValueChange={handleOnValueChange}>
        <div className="space-between flex items-center">
          <TabsList>
            <TabsTrigger value="all" className="relative">
              {t('contents.list.allTab')}
            </TabsTrigger>
            <TabsTrigger value="published">{t('contents.list.publishedTab')}</TabsTrigger>
          </TabsList>
          <div className="ml-auto">
            <Button onClick={openCreateFormHandler} disabled={isViewOnly}>
              <PlusCircledIcon className="mr-2 h-4 w-4" />
              {t('contents.list.newButton', { type: t('contents.types.banner'), context: 'feminine' })}
            </Button>
          </div>
        </div>
        {isLoading && <ContentListSkeleton count={9} />}
        {!isLoading && contents && contents.length === 0 && (
          <EmptyPlaceholder
            name={t('contents.list.banners.emptyTitle')}
            description={t('contents.list.banners.emptyDescription')}
          >
            <Button onClick={openCreateFormHandler} disabled={isViewOnly}>
              <PlusCircledIcon className="mr-2 h-4 w-4" />
              {t('contents.list.newButton', { type: t('contents.types.banner'), context: 'feminine' })}
            </Button>
          </EmptyPlaceholder>
        )}
        {!isLoading && contents && contents.length > 0 && (
          <>
            <TabsContent value="all" className="border-none p-0 outline-none">
              <DataTable />
            </TabsContent>
            <TabsContent
              value="published"
              className="h-full flex-col border-none p-0 data-[state=active]:flex"
            >
              <DataTable />
            </TabsContent>
          </>
        )}
      </Tabs>
      <BannerCreateForm isOpen={open} onClose={handleOnClose} />
      <ExtensionInstallDialog
        isOpen={isOpenedInstall}
        onInstalled={handleOnInstalled}
        onOpenChange={setIsOpenedInstall}
      />
    </div>
  );
};

BannerListContent.displayName = 'BannerListContent';
