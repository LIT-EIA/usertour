import { useAppContext } from '@/contexts/app-context';
import { BackButton } from '@/components/atoms/back-button';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionContext } from '@/contexts/content-version-context';
import { useContentBuilder } from '@/hooks/useContentBuilder';
import { DotsHorizontalIcon, EnterIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { EditIcon, PlaneIcon, SpinnerIcon } from '@usertour-packages/icons';
import { buildConfig, cn, isPublishedInAllEnvironments } from '@usertour/helpers';
import { ContentDataType } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { formatRelativeTime } from '@/utils/common';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ContentEditDropdownMenu } from '../shared/content-edit-dropmenu';
import { ContentPublishForm } from '../shared/content-publish-form';
import { ContentRenameForm } from '../shared/content-rename-form';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { ContentDetailHeaderSkeleton } from './content-detail-header-skeleton';
import { useTranslation } from 'react-i18next';

function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const { contentId } = useParams();
  const { environment } = useAppContext();
  const { contentType } = useContentDetailContext();
  const location = useLocation();
  const { t } = useTranslation();
  const baseUrl = `/env/${environment?.id}/${contentType}/${contentId}`;

  const navigations = [
    {
      name: t('contents.detail.tabs.analytics'),
      href: '/analytics',
    },
    {
      name: t('contents.detail.tabs.content'),
      href: '/detail',
    },
    // {
    //   name: t('contents.detail.tabs.localization'),
    //   href: "/localization",
    // },
    {
      name: t('contents.detail.tabs.versions'),
      href: '/versions',
    },
  ];

  const navs = navigations.map((nav) => {
    return { ...nav, href: baseUrl + nav.href };
  });
  return (
    <nav
      className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 lg:gap-x-6', className)}
      {...props}
    >
      {navs.map((nav, index) => (
        <Link
          to={nav.href}
          key={index}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            location.pathname.indexOf(nav.href) !== -1 ? '' : 'text-muted-foreground',
          )}
        >
          {nav.name}
        </Link>
      ))}
    </nav>
  );
}

export const ContentDetailHeader = () => {
  const navigator = useNavigate();
  const { content, refetch, contentType, loading } = useContentDetailContext();
  const [openPublish, setOpenPublish] = useState(false);
  const { version, isSaveing } = useContentVersionContext();
  const { environment, isViewOnly } = useAppContext();
  const { openBuilder } = useContentBuilder();
  const { environmentList } = useEnvironmentListContext();
  const [_, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useTranslation();

  // Show skeleton if content is loading
  if (loading) {
    return <ContentDetailHeaderSkeleton />;
  }

  if (!contentType || !content) return null;

  const isDisabled = isPublishedInAllEnvironments(content, environmentList, version);

  const handlePublishClick = () => {
    if (
      (content.type === ContentDataType.FLOW || content.type === ContentDataType.LAUNCHER) &&
      version
    ) {
      const config = buildConfig(version.config);
      if (config.enabledAutoStartRules && !config.autoStartRules.length) {
        toast({
          variant: 'destructive',
          title: t('contents.detail.autoStartConditionRequiredTitle'),
          description: t('contents.detail.autoStartConditionRequiredDescription'),
        });
        return;
      }
    }
    setOpenPublish(true);
  };

  const handleBack = () => {
    navigator(`/env/${environment?.id}/${contentType}`);
    if (content.published) {
      setSearchParams({ published: '1' });
    }
  };

  return (
    <>
      <>
        {/* Reflow / resize text (WCAG 1.4.4, 1.4.10, F69): the bar wraps instead of overflowing and
            grows with its content (min-h, not h). It is sticky (not fixed) on wide screens so a taller,
            wrapped bar pushes the page down instead of covering it; below lg (incl. 200–400% zoom)
            it scrolls with the page so it doesn't eat a large part of a short viewport. */}
        <div data-page-header className="border-b bg-white w-full z-10 lg:sticky lg:top-0">
          <div className="flex flex-wrap min-h-16 items-center gap-x-4 gap-y-2 px-4 py-2">
            <div className="flex items-center min-w-0 max-w-full">
              <BackButton className="sm:ml-4 flex-none" onClick={handleBack} />
              <h1 className="min-w-0 break-words lg:max-w-xs">{content?.name}</h1>
              <ContentRenameForm
                data={content}
                onSubmit={() => {
                  refetch();
                }}
              >
                <Button
                  title={t('contents.shared.rename.title', {
                    type: t(`contents.types.${content.type}`),
                  })}
                  variant={'ghost'}
                  className="hover:bg-transparent"
                  disabled={isViewOnly}
                  aria-label={t('contents.shared.rename.title', {
                    type: t(`contents.types.${content.type}`),
                  })}
                >
                  <EditIcon
                    className="ml-1 cursor-pointer"
                    width={16}
                    height={16}
                    aria-hidden="true"
                  />
                </Button>
              </ContentRenameForm>
            </div>
            <MainNav className="lg:mx-6" />
            <div className="ml-auto flex flex-wrap items-center gap-2 lg:gap-4">
              {isSaveing && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
              {!isSaveing && (
                <div className="px-1 text-sm text-muted-foreground lg:min-w-60 lg:text-right">
                  {content.editedVersionId !== content.publishedVersionId &&
                    version &&
                    t('contents.detail.autosaved', {
                      when: formatRelativeTime(new Date(version?.updatedAt)),
                    })}
                  {content.editedVersionId === content.publishedVersionId &&
                    content.publishedAt &&
                    t('contents.detail.autosaved', {
                      when: formatRelativeTime(new Date(content.publishedAt)),
                    })}
                </div>
              )}
              {/* <ContentOpenBuilder content={content} /> */}
              <Button
                type="button"
                variant={'outline'}
                onClick={() => openBuilder(content, contentType)}
                className="flex-none"
                disabled={isViewOnly}
              >
                <EnterIcon className="mr-2" />
                {t('contents.detail.editInBuilder')}
              </Button>
              <Button disabled={isDisabled || isViewOnly} onClick={handlePublishClick}>
                <PlaneIcon className="mr-1" width={20} height={20} />
                {t('contents.detail.publish')}
              </Button>
              {content && (
                <ContentEditDropdownMenu
                  content={content}
                  disabled={isViewOnly}
                  onSubmit={(action: string) => {
                    if (action === 'delete') {
                      navigator(`/env/${environment?.id}/${contentType}`);
                    } else {
                      refetch();
                    }
                  }}
                >
                  <Button title={t('contents.detail.actionsMenu')} variant="secondary">
                    <span className="sr-only">{t('contents.detail.actionsMenu')}</span>
                    <DotsHorizontalIcon className="h-4 w-4" />
                  </Button>
                </ContentEditDropdownMenu>
              )}
            </div>
          </div>
        </div>
        <ContentPublishForm
          versionId={content.editedVersionId || ''}
          open={openPublish}
          onOpenChange={setOpenPublish}
          onSubmit={async () => {
            setOpenPublish(false);
            await refetch();
          }}
        />
      </>
    </>
  );
};

ContentDetailHeader.displayName = 'ContentDetailHeader';
