import { Crosshair2Icon, QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { EXTENSION_SELECT } from '@usertour-packages/constants';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import { SelectorDialog } from '@usertour-packages/shared-components';
import { ContentActions } from '@usertour-packages/shared-editor';
import { Switch } from '@usertour-packages/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@usertour-packages/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import {
  Attribute,
  Content,
  ContentVersion,
  ElementSelectorPropsData,
  RulesCondition,
  Step,
  StepScreenshot,
} from '@usertour/types';
import { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ContentError, ContentErrorAnchor, ContentErrorContent } from './content-error';

export interface ContentPlacementProps {
  title?: string;
  subTitle?: string;
  target: ElementSelectorPropsData | undefined;
  attributeList: Attribute[] | undefined;
  currentVersion: ContentVersion | undefined;
  zIndex: number;
  onTargetChange: (value: Partial<ElementSelectorPropsData>) => void;
  onScreenChange?: (value: StepScreenshot) => void;
  onChangeElement: () => void;
  contents: Content[];
  screenshot: StepScreenshot | undefined;
  buildUrl?: string;
  currentStep: Step | undefined;
  token: string;
  isWebBuilder?: boolean;
  isShowError?: boolean;
  isShowActions?: boolean;
  createStep?: (currentVersion: ContentVersion, sequence: number) => Promise<Step | undefined>;
}
export const ContentPlacement = (props: ContentPlacementProps) => {
  const { t } = useTranslation();
  const {
    target,
    attributeList,
    currentVersion,
    zIndex,
    onTargetChange,
    onChangeElement,
    contents,
    screenshot,
    isWebBuilder,
    token,
    buildUrl,
    onScreenChange,
    isShowError = false,
    isShowActions = true,
    currentStep,
    createStep,
    title = t('contentBuilder.shared.elementLabel'),
    subTitle = t('contentBuilder.flow.showTooltipOnElement'),
  } = props;

  const handleSequenceChange = (value: string) => {
    onTargetChange({ sequence: value });
  };
  const handlePrecisionChange = (value: string) => {
    onTargetChange({ precision: value });
  };
  const handleDynamicContent = (value: boolean) => {
    onTargetChange({ isDynamicContent: value });
  };
  const handleActionChange = (actions: RulesCondition[]) => {
    onTargetChange({ actions });
  };
  const handlePlacementTypeChange = (value: string) => {
    onTargetChange({ type: value });
  };
  const handleElementTextChange = (e: ChangeEvent<HTMLInputElement>) => {
    onTargetChange({ content: e.target.value });
  };
  const handleSelectorChange = (e: ChangeEvent<HTMLInputElement>) => {
    onTargetChange({ customSelector: e.target.value });
  };
  const handleCustomSelectorSelect = (item: string) => {
    onTargetChange({ customSelector: item });
  };
  const handleElementSelectSuccess = (output: any) => {
    onTargetChange({
      selectors: output.target.selectors,
      content: output.target.content,
      selectorsList: output.target.selectorsList,
    });
    if (onScreenChange) {
      onScreenChange(output.screenshot);
    }
  };

  return (
    <div className="space-y-3">
      <h1 className="text-sm">{title}</h1>
      <Tabs defaultValue={target?.type ?? 'auto'} onValueChange={handlePlacementTypeChange}>
        <TabsList className="grid w-full grid-cols-2 bg-background-700">
          <TabsTrigger
            value="auto"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {t('contentBuilder.shared.auto')}
          </TabsTrigger>
          <TabsTrigger
            value="manual"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {t('contentBuilder.shared.manual')}
          </TabsTrigger>
        </TabsList>
        <div className="flex flex-col  bg-background-700 p-3.5 rounded-lg space-y-6 mt-2">
          <TabsContent value="auto">
            <ContentError
              open={isShowError && (!target?.selectors || target?.selectors.length === 0)}
            >
              <div className="flex flex-col space-y-2">
                <h1 className="text-sm">{subTitle}</h1>
                {!isWebBuilder && (
                  <div className="rounded-2xl flex-col overflow-hidden" onClick={onChangeElement}>
                    <div className="w-[242px] h-[130px] overflow-hidden">
                      <img src={screenshot?.mini} alt="" />
                    </div>
                    <ContentErrorAnchor>
                      <Button className="w-full rounded-none">
                        <Crosshair2Icon className="mr-2" />
                        {t('contentBuilder.shared.selectAnotherElement')}
                      </Button>
                    </ContentErrorAnchor>
                  </div>
                )}

                {isWebBuilder && (
                  <SelectorDialog
                    onSuccess={handleElementSelectSuccess}
                    buildUrl={buildUrl}
                    zIndex={zIndex + EXTENSION_SELECT}
                    token={token}
                  >
                    <div className="rounded-2xl flex-col overflow-hidden">
                      <div className="w-[242px] h-[130px] overflow-hidden">
                        <img src={screenshot?.mini} alt="" />
                      </div>
                      <ContentErrorAnchor>
                        <Button className="w-full rounded-none">
                          <Crosshair2Icon className="mr-2" />
                          {!target && t('contentBuilder.shared.selectElementButton')}
                          {target && t('contentBuilder.shared.selectAnotherElement')}
                        </Button>
                      </ContentErrorAnchor>
                    </div>
                  </SelectorDialog>
                )}
                <div className="items-center  space-y-2">
                  <div className="flex justify-start items-center space-x-1	">
                    <Label>{t('contentBuilder.shared.precision.label')}</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <QuestionMarkCircledIcon />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('contentBuilder.shared.precision.tooltip')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select onValueChange={handlePrecisionChange} defaultValue={target?.precision}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('contentBuilder.shared.precision.selectPlaceholder')}
                      />
                    </SelectTrigger>
                    <SelectPortal style={{ zIndex: zIndex + EXTENSION_SELECT }}>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="loosest">
                            <div className="flex">
                              {t('contentBuilder.shared.precision.loosest')}
                            </div>
                          </SelectItem>
                          <SelectItem value="looser">
                            <div className="flex">
                              {t('contentBuilder.shared.precision.looser')}
                            </div>
                          </SelectItem>
                          <SelectItem value="loose">
                            <div className="flex">{t('contentBuilder.shared.precision.loose')}</div>
                          </SelectItem>
                          <SelectItem value="strict">
                            <div className="flex">
                              {t('contentBuilder.shared.precision.strict')}
                            </div>
                          </SelectItem>
                          <SelectItem value="stricter">
                            <div className="flex">
                              {t('contentBuilder.shared.precision.stricter')}
                            </div>
                          </SelectItem>
                          <SelectItem value="strictest">
                            <div className="flex">
                              {t('contentBuilder.shared.precision.strictest')}
                            </div>
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </SelectPortal>
                  </Select>
                </div>
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex space-x-2 grow">
                    <Label htmlFor="dynamic-content" className="flex flex-col space-y-1">
                      <span className="font-normal">{t('contentBuilder.shared.dynamicText')}</span>
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <QuestionMarkCircledIcon />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('contentBuilder.shared.dynamicTextTooltip')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Switch
                    className="data-[state=unchecked]:bg-input"
                    id="dynamic-content"
                    checked={target?.isDynamicContent ?? true}
                    onCheckedChange={handleDynamicContent}
                  />
                </div>
              </div>
              <ContentErrorContent style={{ zIndex: zIndex + EXTENSION_SELECT }}>
                {t('contentBuilder.shared.selectElementError')}
              </ContentErrorContent>
            </ContentError>
          </TabsContent>
          <TabsContent value="manual">
            <ContentError open={isShowError && !target?.customSelector}>
              <div className="flex flex-col space-y-2">
                <h1 className="text-sm">{subTitle}</h1>
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-start items-center space-x-1	">
                    <Label htmlFor="button-manual-element-text">
                      {t('contentBuilder.shared.elementText')}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <QuestionMarkCircledIcon />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('contentBuilder.shared.elementTextTooltip')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    className="bg-background-900"
                    id="button-manual-element-text"
                    value={target?.content}
                    placeholder={t('contentBuilder.checklist.none')}
                    onChange={handleElementTextChange}
                  />
                  <div className="flex justify-start items-center space-x-1	">
                    <Label htmlFor="button-manual-css-selector">
                      {t('contentBuilder.shared.cssSelector')}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <QuestionMarkCircledIcon />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('contentBuilder.shared.cssSelectorTooltip')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <ContentErrorAnchor>
                    <Input
                      className="bg-background-900"
                      id="button-manual-css-selector"
                      value={target?.customSelector}
                      placeholder={t('contentBuilder.checklist.none')}
                      onChange={handleSelectorChange}
                    />
                  </ContentErrorAnchor>
                  <div className="flex flex-row gap-1 text-sm font-medium leading-none flex-wrap">
                    {target?.selectorsList?.map((item, key) => (
                      <Button
                        variant="secondary"
                        className="min-h-7 h-auto py-2 bg-background-900 hover:bg-secondary-hover dark:hover:bg-gray-800"
                        key={key}
                        onClick={() => {
                          handleCustomSelectorSelect(item);
                        }}
                      >
                        {item}
                      </Button>
                    ))}
                  </div>
                  <div className="flex justify-start items-center space-x-1	">
                    <Label htmlFor="button-manual-css-selector">
                      {t('contentBuilder.shared.ifMultipleMatches')}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <QuestionMarkCircledIcon />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{t('contentBuilder.shared.ifMultipleMatches')}</p>
                          <p>{t('contentBuilder.shared.ifMultipleMatchesTooltip')} </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select onValueChange={handleSequenceChange} defaultValue={target?.sequence}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('contentBuilder.checklist.selectOption')} />
                    </SelectTrigger>
                    <SelectPortal style={{ zIndex: zIndex + EXTENSION_SELECT }}>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="1st">
                            <div className="flex">{t('contentBuilder.shared.selectElement.1')}</div>
                          </SelectItem>
                          <SelectItem value="2st">
                            <div className="flex">{t('contentBuilder.shared.selectElement.2')}</div>
                          </SelectItem>
                          <SelectItem value="3st">
                            <div className="flex">{t('contentBuilder.shared.selectElement.3')}</div>
                          </SelectItem>
                          <SelectItem value="4st">
                            <div className="flex">{t('contentBuilder.shared.selectElement.4')}</div>
                          </SelectItem>
                          <SelectItem value="5st">
                            <div className="flex">{t('contentBuilder.shared.selectElement.5')}</div>
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </SelectPortal>
                  </Select>
                </div>
              </div>
              <ContentErrorContent style={{ zIndex: zIndex + EXTENSION_SELECT }}>
                {t('contentBuilder.shared.cssSelectorRequired')}
              </ContentErrorContent>
            </ContentError>
          </TabsContent>
          {isShowActions && (
            <div className="flex flex-col space-y-2">
              <div className="items-center  space-y-2">
                <Label>{t('contentBuilder.shared.whenTargetClicked')}</Label>

                <ContentActions
                  zIndex={zIndex + EXTENSION_SELECT}
                  isShowIf={false}
                  isShowLogic={false}
                  currentStep={currentStep}
                  currentVersion={currentVersion}
                  onDataChange={handleActionChange}
                  defaultConditions={target?.actions || []}
                  attributes={attributeList}
                  contents={contents}
                  createStep={createStep}
                />
              </div>
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
};
ContentPlacement.displayName = 'ContentPlacement';
