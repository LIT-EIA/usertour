'use client';

import { PlusCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import { EXTENSION_SELECT } from '@usertour-packages/constants';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { ScrollArea } from '@usertour-packages/scroll-area';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import { Switch } from '@usertour-packages/switch';
import { ChecklistCompletionOrder, ChecklistInitialDisplay } from '@usertour/types';
import { uuidV4 } from '@usertour/helpers';
import { useTranslation } from 'react-i18next';
import { useBuilderContext, useChecklistContext } from '../../contexts';
import { SidebarContainer } from '../sidebar';
import { SidebarFooter } from '../sidebar/sidebar-footer';
import { SidebarHeader } from '../sidebar/sidebar-header';
import { SidebarTheme } from '../sidebar/sidebar-theme';
import { ChecklistContents } from './components/checklist-contents';

// Common styles
const flexBetween = 'flex items-center justify-between space-x-2';
const labelStyles = 'flex justify-start items-center space-x-1';

const ChecklistCoreBody = () => {
  const { localData, zIndex, addItem, updateLocalData } = useChecklistContext();
  const { t } = useTranslation();

  if (!localData) {
    return null;
  }

  const defaultItem = {
    name: t('contentBuilder.checklist.newItemName'),
    description: t('contentBuilder.checklist.newItemDescription'),
    clickedActions: [],
    isCompleted: false,
    completeConditions: [],
    onlyShowTask: false,
    onlyShowTaskConditions: [],
  };

  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          <SidebarTheme />

          {/* Launcher Button Text */}
          <div className="flex flex-col space-y-2">
            <div className={labelStyles}>
              <Label htmlFor="launcher-button-text">
                {t('contentBuilder.checklist.launcherButtonText')}
              </Label>
            </div>
            <Input
              className="bg-background-900"
              id="launcher-button-text"
              value={localData.buttonText}
              onChange={(e) => {
                updateLocalData({ buttonText: e.target.value });
              }}
              placeholder={t('contentBuilder.checklist.none')}
            />
          </div>

          <ChecklistContents />

          {/* Add Item Button */}
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => addItem({ ...defaultItem, id: uuidV4() })}
          >
            <PlusCircledIcon className="mr-2" />
            {t('contentBuilder.checklist.addItem')}
          </Button>

          {/* Initial Display Select */}
          <div className={labelStyles}>
            <Label htmlFor="initial-display">{t('contentBuilder.checklist.initialDisplay')}</Label>
            <QuestionTooltip>{t('contentBuilder.checklist.initialDisplayTooltip')}</QuestionTooltip>
          </div>
          <Select
            onValueChange={(value) =>
              updateLocalData({
                initialDisplay: value as ChecklistInitialDisplay,
              })
            }
            defaultValue={localData.initialDisplay}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('contentBuilder.checklist.selectOption')} />
            </SelectTrigger>
            <SelectPortal style={{ zIndex: zIndex + EXTENSION_SELECT }}>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={ChecklistInitialDisplay.EXPANDED}>
                    {t('contentBuilder.checklist.expandedChecklist')}
                  </SelectItem>
                  <SelectItem value={ChecklistInitialDisplay.BUTTON}>
                    {t('contentBuilder.checklist.launcherButton')}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </SelectPortal>
          </Select>

          {/* Task Completion Order Select */}
          <div className={labelStyles}>
            <Label htmlFor="completion-order">{t('contentBuilder.checklist.completionOrder')}</Label>
          </div>
          <Select
            onValueChange={(value) =>
              updateLocalData({
                completionOrder: value as ChecklistCompletionOrder,
              })
            }
            defaultValue={localData.completionOrder}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('contentBuilder.checklist.selectOption')} />
            </SelectTrigger>
            <SelectPortal style={{ zIndex: zIndex + EXTENSION_SELECT }}>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={ChecklistCompletionOrder.ANY}>
                    {t('contentBuilder.checklist.anyOrder')}
                  </SelectItem>
                  <SelectItem value={ChecklistCompletionOrder.ORDERED}>
                    {t('contentBuilder.checklist.inOrder')}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </SelectPortal>
          </Select>

          {/* Prevent Dismiss Checklist Switch */}
          <div className={flexBetween}>
            <div className={labelStyles}>
              <Label htmlFor="prevent-dismiss-checklist" className="font-normal">
                {t('contentBuilder.checklist.preventDismissal')}
              </Label>
              <QuestionTooltip>{t('contentBuilder.checklist.preventDismissalTooltip')}</QuestionTooltip>
            </div>
            <Switch
              id="prevent-dismiss-checklist"
              className="data-[state=unchecked]:bg-input"
              checked={localData.preventDismissChecklist}
              onCheckedChange={(value) => updateLocalData({ preventDismissChecklist: value })}
            />
          </div>

          {/* Auto-dismiss Checklist Switch */}
          <div className={flexBetween}>
            <div className={labelStyles}>
              <Label htmlFor="auto-dismiss-checklist" className="font-normal">
                {t('contentBuilder.checklist.autoDismiss')}
              </Label>
              <QuestionTooltip>
                {t('contentBuilder.checklist.autoDismissTooltip')}
              </QuestionTooltip>
            </div>
            <Switch
              id="auto-dismiss-checklist"
              className="data-[state=unchecked]:bg-input"
              checked={localData.autoDismissChecklist}
              onCheckedChange={(value) => updateLocalData({ autoDismissChecklist: value })}
            />
          </div>
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const ChecklistCoreHeader = () => {
  const { currentContent } = useBuilderContext();
  return (
    <CardHeader className="flex-none p-4 space-y-3">
      <CardTitle className="flex h-8">
        <SidebarHeader title={currentContent?.name ?? ''} />
      </CardTitle>
    </CardHeader>
  );
};

const ChecklistCoreFooter = () => {
  return (
    <CardFooter className="flex p-5">
      <SidebarFooter />
    </CardFooter>
  );
};

export const ChecklistCore = () => {
  return (
    <SidebarContainer>
      <ChecklistCoreHeader />
      <ChecklistCoreBody />
      <ChecklistCoreFooter />
    </SidebarContainer>
  );
};

ChecklistCore.displayName = 'ChecklistCore';
