import { ChevronDownIcon, GearIcon } from '@radix-ui/react-icons';
import { EXTENSION_SELECT } from '@usertour-packages/constants';
import { useAttributeListContext } from '@usertour-packages/contexts';
import { useContentListContext } from '@usertour-packages/contexts';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { TooltipIcon } from '@usertour-packages/icons';
import { ContentActions } from '@usertour-packages/shared-editor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@usertour-packages/tabs';
import {
  ContentActionsItemType,
  LauncherActionType,
  LauncherBehaviorType,
  LauncherTriggerElement,
  LauncherTriggerEvent,
  RulesCondition,
} from '@usertour/types';
import { TFunction } from 'i18next';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBuilderContext, useLauncherContext } from '../../../contexts';
import { BuilderMode } from '../../../contexts';

interface TriggerDropdownProps {
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
  zIndex: number;
  label?: string;
}

const TriggerDropdown = ({ value, options, onChange, zIndex }: TriggerDropdownProps) => {
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex flex-row items-center space-x-2 text-sm text-primary cursor-pointer w-fit">
          <span>{selectedLabel}</span>
          <ChevronDownIcon width={16} height={16} />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" style={{ zIndex: zIndex + EXTENSION_SELECT }}>
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const buildTriggerElementOptions = (t: TFunction) =>
  [
    {
      value: LauncherTriggerElement.LAUNCHER,
      label: t('contentBuilder.launcher.behaviorEditor.triggerElement.launcher'),
    },
    {
      value: LauncherTriggerElement.TARGET,
      label: t('contentBuilder.launcher.behaviorEditor.triggerElement.targetElement'),
    },
    {
      value: LauncherTriggerElement.TARGET_OR_LAUNCHER,
      label: t('contentBuilder.launcher.behaviorEditor.triggerElement.targetOrLauncher'),
    },
  ] as const;

const buildTriggerEventOptions = (t: TFunction) =>
  [
    {
      value: LauncherTriggerEvent.HOVERED,
      label: t('contentBuilder.launcher.behaviorEditor.triggerEvent.hovered'),
    },
    {
      value: LauncherTriggerEvent.CLICKED,
      label: t('contentBuilder.launcher.behaviorEditor.triggerEvent.clicked'),
    },
  ] as const;

export const LauncherBehavior = () => {
  const { setCurrentMode, zIndex, currentVersion } = useBuilderContext();
  const { contents } = useContentListContext();
  const { attributeList } = useAttributeListContext();
  const { localData, updateLocalDataBehavior, setLauncherTooltip } = useLauncherContext();
  const { t } = useTranslation();
  const TRIGGER_ELEMENT_OPTIONS = buildTriggerElementOptions(t);
  const TRIGGER_EVENT_OPTIONS = buildTriggerEventOptions(t);

  const handleStateChange = useCallback(
    (key: keyof LauncherBehaviorType) => (value: string | RulesCondition[]) => {
      updateLocalDataBehavior({
        [key]: value,
      });
    },
    [updateLocalDataBehavior],
  );

  const handleSwitchToTooltip = useCallback(() => {
    if (!localData?.tooltip) return;

    setCurrentMode({ mode: BuilderMode.LAUNCHER_TOOLTIP });
    setLauncherTooltip(localData.tooltip);
  }, [localData?.tooltip, setCurrentMode, setLauncherTooltip]);

  if (!localData) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-sm">{t('contentBuilder.launcher.behavior')}</h1>
      </div>
      <div className="flex flex-col bg-background-700 p-3.5 rounded-lg space-y-1">
        <div className="text-sm">{t('contentBuilder.launcher.behaviorEditor.when')}</div>
        <div className="flex flex-row space-x-1 items-center">
          <TriggerDropdown
            value={localData.behavior.triggerElement}
            options={TRIGGER_ELEMENT_OPTIONS}
            onChange={handleStateChange('triggerElement')}
            zIndex={zIndex}
          />
          <span className="text-sm">{t('contentBuilder.launcher.behaviorEditor.is')}</span>
          <TriggerDropdown
            value={localData.behavior.triggerEvent}
            options={TRIGGER_EVENT_OPTIONS}
            onChange={handleStateChange('triggerEvent')}
            zIndex={zIndex}
          />
        </div>
        <div className="text-sm">{t('contentBuilder.launcher.behaviorEditor.thenLabel')}</div>
        <Tabs
          defaultValue={localData.behavior.actionType}
          onValueChange={handleStateChange('actionType')}
        >
          <TabsList className="grid w-full grid-cols-2 bg-background">
            <TabsTrigger
              value="show-tooltip"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {t('contentBuilder.launcher.behaviorEditor.showTooltip')}
            </TabsTrigger>
            <TabsTrigger
              value="perform-action"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {t('contentBuilder.launcher.behaviorEditor.performAction')}
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value={LauncherActionType.SHOW_TOOLTIP}
            className="bg-background p-2 rounded-lg "
          >
            <div
              className="flex flex-row items-center justify-between cursor-pointer h-8"
              onClick={handleSwitchToTooltip}
            >
              <div className="flex flex-row space-x-1 items-center">
                <TooltipIcon className="h-4 w-4 mt-1" />
                <span className="text-sm">
                  {t('contentBuilder.launcher.behaviorEditor.tooltipSetting')}
                </span>
              </div>
              <GearIcon className="h-4 w-4" />
            </div>
          </TabsContent>
          <TabsContent
            value={LauncherActionType.PERFORM_ACTION}
            className="bg-background p-2 rounded-lg"
          >
            <ContentActions
              zIndex={zIndex + EXTENSION_SELECT}
              isShowIf={false}
              isShowLogic={false}
              currentStep={undefined}
              currentVersion={currentVersion}
              onDataChange={handleStateChange('actions')}
              defaultConditions={localData.behavior.actions}
              attributes={attributeList}
              contents={contents}
              filterItems={[
                ContentActionsItemType.LAUNCHER_DISMIS,
                ContentActionsItemType.JAVASCRIPT_EVALUATE,
                ContentActionsItemType.PAGE_NAVIGATE,
                ContentActionsItemType.FLOW_START,
              ]}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
LauncherBehavior.displayName = 'LauncherBehavior';
