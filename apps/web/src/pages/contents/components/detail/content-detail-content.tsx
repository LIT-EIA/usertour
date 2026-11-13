import { useContentDetailContext } from '@/contexts/content-detail-context';
import { useContentVersionContext } from '@/contexts/content-version-context';
import { useThemeListContext } from '@/contexts/theme-list-context';
import { useContentBuilder } from '@/hooks/useContentBuilder';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { Badge } from '@usertour-packages/badge';
import { stepIsReachable } from '@usertour-packages/builder/src/utils/content-validate';
import { AddIcon, EditIcon, EyeNoneIcon } from '@usertour-packages/icons';
import { GoogleFontCss } from '@usertour-packages/shared-components';
import { Tooltip, TooltipContent, TooltipTrigger } from '@usertour-packages/tooltip';
import { TooltipProvider } from '@usertour-packages/tooltip';
import {
  ChecklistData,
  ChecklistInitialDisplay,
  Content,
  ContentTypeName,
  ContentVersion,
  LauncherActionType,
  LauncherData,
  LauncherDataType,
  Step,
  Theme,
} from '@usertour/types';
import { formatDate } from '@/utils/common';
import { cn } from '@usertour/helpers';
import { useEffect, useState } from 'react';
import { ContentEditForm } from '../shared/content-edit-form';
import {
  ChecklistPreview,
  DisabledPreview,
  FlowPreview,
  LauncherPreview,
  ScaledPreviewContainer,
} from '../shared/content-preview';
import { useAppContext } from '@/contexts/app-context';
import { Button } from '@usertour-packages/button';
import { useTranslation } from 'react-i18next';

interface ContentDetailContentStepProps {
  currentStep: Step;
  index: number;
  currentVersion: ContentVersion;
  onEdit: () => void;
  disabled: boolean;
}

const ContentBadge = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <Badge variant={'secondary'} className={cn('max-w-full', className)}>
      {/* Long values (e.g. a CSS selector) wrap instead of overflowing the card (WCAG 1.4.10) */}
      <span className="min-w-0 first-letter:uppercase [overflow-wrap:anywhere]">{children}</span>
    </Badge>
  );
};

// Cards are laid out visually as [preview | details] with Edit top-right and "Last edited"
// bottom-right, but the DOM follows the logical reading order so screen-reader arrow navigation
// and Tab order match (WCAG 1.3.2, 2.4.3): name (heading) → Edit → details → preview → last edited.
// Edit sits right after the heading so a keyboard user who Tabs to it and then continues with the
// arrow keys reads that same card's details next (not the following card's).
// Reflow / resize text (WCAG 1.4.4, 1.4.10, F69): a grid places the parts (no absolute
// positioning, so enlarged or wrapped text can't run under Edit / "Last edited"); it collapses to
// a single column on narrow viewports (preview first, as on wide screens); badges wrap; long
// names and values break instead of being truncated or overflowing.
const cardClassName =
  'grid grid-cols-1 gap-x-8 gap-y-3 p-4 sm:px-8 sm:grid-cols-[10rem_minmax(0,1fr)] shadow bg-white rounded-lg';
const cardDetailsClassName = 'min-w-0 flex flex-col space-y-1 sm:col-start-2 sm:row-start-1';
const cardPreviewClassName =
  'order-first sm:order-none sm:col-start-1 sm:row-start-1 sm:row-span-2';
const cardBadgeRowClassName = 'text-sm flex flex-wrap gap-1';

const CardTitle = ({
  children,
  action,
}: { children: React.ReactNode; action: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-2">
    <h2 className="font-bold min-w-0 break-words">{children}</h2>
    {action}
  </div>
);

const CardLastEdited = ({ date }: { date?: string | Date }) => {
  const { t } = useTranslation();
  return (
    <div className="text-xs text-muted-foreground self-end sm:text-right sm:col-start-2 sm:row-start-2">
      {t('contents.overview.previewCard.lastEdited', {
        date: date ? formatDate(new Date(date), 'PPpp') : '',
      })}
    </div>
  );
};

const CardEditButton = ({
  name,
  onEdit,
  disabled,
}: {
  name: string;
  onEdit: () => void;
  disabled: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-row space-x-1 items-center flex-none">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={'ghost'}
              size={'icon'}
              onClick={onEdit}
              disabled={disabled}
              aria-label={t('contents.overview.previewCard.editAriaLabel', { name })}
            >
              <EditIcon className="w-4 h-4 cursor-pointer" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('contents.overview.previewCard.edit')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

// Create a custom hook for theme handling
const useThemeHandler = (version: ContentVersion, themeId?: string) => {
  const { themeList } = useThemeListContext();
  const [currentTheme, setCurrentTheme] = useState<Theme | undefined>();

  useEffect(() => {
    if (!themeList?.length) return;

    let theme: Theme | undefined;
    if (themeId) {
      theme = themeList.find((item) => item.id === themeId);
    } else if (version?.themeId) {
      theme = themeList.find((item) => item.id === version.themeId);
    }

    theme && setCurrentTheme(theme);
  }, [themeList, version, themeId]);

  return currentTheme;
};

// Simplified ContentDetailContentStep
const ContentDetailContentStep = ({
  currentStep,
  index,
  currentVersion,
  onEdit,
  disabled,
}: ContentDetailContentStepProps) => {
  const { t } = useTranslation();
  const currentTheme = useThemeHandler(currentVersion, currentStep.themeId);
  const [contentRect, setContentRect] = useState<DOMRect | null>(null);
  const [scale, setScale] = useState<number>(1);
  const height =
    contentRect?.height && contentRect?.width && contentRect?.height > contentRect?.width
      ? contentRect?.height * scale
      : undefined;

  if (!currentStep || !currentTheme) return null;

  const isHidddenStep = currentStep.type === 'hidden';
  const stepName = `${index + 1}. ${currentStep.name}`;

  return (
    <li className={cardClassName}>
      <GoogleFontCss settings={currentTheme.settings} />
      <div className={cardDetailsClassName}>
        <CardTitle action={<CardEditButton name={stepName} onEdit={onEdit} disabled={disabled} />}>
          {stepName}
        </CardTitle>
        <div className={cardBadgeRowClassName}>
          <ContentBadge>
            {t(`contentBuilder.flow.stepType.${currentStep.type}`, currentStep.type)}
          </ContentBadge>
          {!isHidddenStep && (
            <>
              <ContentBadge>
                {t('contents.overview.step.width', { value: `${currentStep.setting.width}px` })}
              </ContentBadge>
              <ContentBadge>
                {t('contents.overview.step.height', {
                  value: `${Math.floor(currentStep.setting.height)}px`,
                })}
              </ContentBadge>
              <ContentBadge>
                {t('contents.overview.step.theme', { name: currentTheme.name })}
              </ContentBadge>
            </>
          )}
        </div>
        {!isHidddenStep && (
          <div className={cardBadgeRowClassName}>
            <ContentBadge>
              {!currentStep.setting.skippable && t('contents.overview.step.notSkippable')}
              {currentStep.setting.skippable && t('contents.overview.step.skippable')}
            </ContentBadge>
            {currentStep.setting.enabledBackdrop && (
              <ContentBadge>{t('contents.overview.step.backdropEnabled')}</ContentBadge>
            )}
            {!currentStep.setting.enabledBackdrop && (
              <ContentBadge>{t('contents.overview.step.backdropDisabled')}</ContentBadge>
            )}
          </div>
        )}
        {!stepIsReachable(currentVersion.steps as Step[], currentStep) && (
          <div className="text-xs flex flex-row items-center text-warning space-x-1 pt-2">
            <ExclamationTriangleIcon className="h-3 w-3 flex-none" aria-hidden="true" />
            <span>{t('contents.overview.step.unreachableWarning')}</span>
          </div>
        )}
      </div>
      {!isHidddenStep && (
        <div
          className={cn(
            cardPreviewClassName,
            'w-40 h-32 flex items-center [&_*]:pointer-events-none pointer-events-none',
          )}
          style={{
            height: height ? `${height}px` : undefined,
          }}
        >
          <ScaledPreviewContainer
            className="origin-[left_center]"
            maxWidth={160}
            maxHeight={600}
            onContentRectChange={(contentRect, scale) => {
              setContentRect(contentRect);
              setScale(scale);
            }}
          >
            <FlowPreview currentTheme={currentTheme} currentStep={currentStep} />
          </ScaledPreviewContainer>
        </div>
      )}
      {isHidddenStep && (
        // Decorative: the "hidden" step-type badge already conveys this
        <div className={cn(cardPreviewClassName, 'w-40 h-32 flex items-center justify-center')}>
          <EyeNoneIcon className="w-8 h-8" aria-hidden="true" />
        </div>
      )}
      <CardLastEdited date={currentStep.updatedAt} />
    </li>
  );
};

interface LauncherContentPreviewProps {
  currentVersion: ContentVersion;
  content: Content;
  onEdit: () => void;
  disabled: boolean;
}

// Simplified LauncherContentPreview
const LauncherContentPreview = ({
  currentVersion,
  content,
  onEdit,
  disabled,
}: LauncherContentPreviewProps) => {
  const { t } = useTranslation();
  const currentTheme = useThemeHandler(currentVersion);
  const data = currentVersion.data as LauncherData;

  if (!currentVersion || !currentTheme) return null;

  return (
    <div className={cardClassName}>
      <GoogleFontCss settings={currentTheme.settings} />
      <div className={cardDetailsClassName}>
        <CardTitle
          action={<CardEditButton name={content.name ?? ''} onEdit={onEdit} disabled={disabled} />}
        >
          {content.name}
        </CardTitle>
        <div className={cardBadgeRowClassName}>
          <ContentBadge>{t(`contentBuilder.launcher.type.${data.type}`, data.type)}</ContentBadge>
          <ContentBadge>
            {t('contents.overview.launcher.targetElement', {
              value: data.target.element?.customSelector ?? t('contents.overview.launcher.notSet'),
            })}
          </ContentBadge>
          <ContentBadge>
            {t('contents.overview.launcher.targetAlignment', {
              value: data.target.alignment.alignType,
            })}
          </ContentBadge>
          <ContentBadge>
            {t('contents.overview.launcher.theme', { name: currentTheme.name })}
          </ContentBadge>
        </div>
        <div className={cardBadgeRowClassName}>
          {data.type === LauncherDataType.ICON && data.iconType && (
            <ContentBadge>
              {t('contents.overview.launcher.iconType', { value: data.iconType })}
            </ContentBadge>
          )}
          <ContentBadge>
            {data.behavior.actionType === LauncherActionType.PERFORM_ACTION
              ? t('contents.overview.launcher.performAction')
              : t('contents.overview.launcher.showTooltip')}
          </ContentBadge>
        </div>
      </div>
      <div className={cn(cardPreviewClassName, 'w-40 h-32 flex items-center justify-center')}>
        <DisabledPreview>
          <LauncherPreview currentTheme={currentTheme} currentVersion={currentVersion} />
        </DisabledPreview>
      </div>
      <CardLastEdited date={currentVersion.updatedAt} />
    </div>
  );
};

interface ChecklistContentPreviewProps {
  currentVersion: ContentVersion;
  content: Content;
  onEdit: () => void;
  disabled: boolean;
}

// Simplified ChecklistContentPreview
const ChecklistContentPreview = ({
  currentVersion,
  content,
  onEdit,
  disabled,
}: ChecklistContentPreviewProps) => {
  const { t } = useTranslation();
  const currentTheme = useThemeHandler(currentVersion);
  const data = currentVersion.data as ChecklistData;
  const [contentRect, setContentRect] = useState<DOMRect | null>(null);
  const [scale, setScale] = useState<number>(1);
  const height =
    contentRect?.height && contentRect?.width && contentRect?.height > contentRect?.width
      ? contentRect?.height * scale
      : undefined;

  if (!currentVersion || !currentTheme) return null;

  return (
    <div className={cardClassName}>
      <GoogleFontCss settings={currentTheme.settings} />
      <div className={cardDetailsClassName}>
        <CardTitle
          action={<CardEditButton name={content.name ?? ''} onEdit={onEdit} disabled={disabled} />}
        >
          {content.name}
        </CardTitle>
        <div className={cardBadgeRowClassName}>
          <ContentBadge>
            {t('contents.overview.checklist.launcherButtonText', { value: data.buttonText })}
          </ContentBadge>
          <ContentBadge>
            {t('contents.overview.checklist.initialDisplay', {
              value:
                data.initialDisplay === ChecklistInitialDisplay.BUTTON
                  ? t('contents.overview.checklist.initialDisplayButton')
                  : t('contents.overview.checklist.initialDisplayExpanded'),
            })}
          </ContentBadge>
          <ContentBadge>
            {t('contents.overview.checklist.completionOrder', { value: data.completionOrder })}
          </ContentBadge>
          {data.preventDismissChecklist && (
            <ContentBadge>{t('contents.overview.checklist.preventDismiss')}</ContentBadge>
          )}
          {!data.preventDismissChecklist && (
            <ContentBadge>{t('contents.overview.checklist.allowDismiss')}</ContentBadge>
          )}
          <ContentBadge>
            {t('contents.overview.checklist.theme', { name: currentTheme.name })}
          </ContentBadge>
          <ContentBadge>
            {t('contents.overview.checklist.items', { count: data.items.length })}
          </ContentBadge>
        </div>
      </div>
      <div
        className={cn(
          cardPreviewClassName,
          'w-40 h-32 flex items-center [&_*]:pointer-events-none pointer-events-none',
        )}
        style={{
          height: height ? `${height}px` : undefined,
        }}
      >
        <ScaledPreviewContainer
          className="origin-[left_center]"
          maxWidth={160}
          maxHeight={600}
          onContentRectChange={(contentRect, scale) => {
            setContentRect(contentRect);
            setScale(scale);
          }}
        >
          <ChecklistPreview currentTheme={currentTheme} currentVersion={currentVersion} />
        </ScaledPreviewContainer>
      </div>
      <CardLastEdited date={currentVersion.updatedAt} />
    </div>
  );
};

export const ContentDetailContent = () => {
  const { version } = useContentVersionContext();
  const { content, contentType } = useContentDetailContext();
  const [state, setState] = useState({
    isOpenedInstall: false,
    open: false,
    isLoading: false,
  });
  const { openBuilder } = useContentBuilder();
  const { isViewOnly } = useAppContext();
  const { t } = useTranslation();

  if (!version || !content || !contentType) return null;

  const showAddButton = contentType === ContentTypeName.FLOWS;

  return (
    <>
      <div className="flex flex-col space-y-6 grow min-w-0">
        {contentType === ContentTypeName.FLOWS && !!version.steps?.length && (
          <ol className="flex flex-col space-y-6">
            {version.steps.map((step, index) => (
              <ContentDetailContentStep
                onEdit={() => openBuilder(content, contentType)}
                currentStep={step}
                index={index}
                key={index}
                currentVersion={version}
                disabled={isViewOnly}
              />
            ))}
          </ol>
        )}
        {contentType === ContentTypeName.LAUNCHERS && content && (
          <LauncherContentPreview
            currentVersion={version}
            content={content}
            onEdit={() => openBuilder(content, contentType)}
            disabled={isViewOnly}
          />
        )}
        {contentType === ContentTypeName.CHECKLISTS && content && version.data && (
          <ChecklistContentPreview
            currentVersion={version}
            content={content}
            onEdit={() => openBuilder(content, contentType)}
            disabled={isViewOnly}
          />
        )}
        {showAddButton && (
          <Button
            title={t('contents.overview.addStep')}
            onClick={() => openBuilder(content, contentType)}
            className="flex py-8 shadow bg-white rounded-lg justify-center cursor-pointer w-auto h-auto hover:bg-white "
            disabled={isViewOnly}
            aria-label={t('contents.overview.addStep')}
          >
            <AddIcon width={40} height={40} className="text-primary" aria-hidden="true" />
          </Button>
        )}
        <ContentEditForm
          content={content}
          onOpenChange={(open) => setState((prev) => ({ ...prev, open }))}
          open={state.open}
        />
      </div>
    </>
  );
};

ContentDetailContent.displayName = 'ContentDetailContent';
