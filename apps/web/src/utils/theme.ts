import {
  ChecklistCompletionOrder,
  ChecklistData,
  ChecklistInitialDisplay,
  ThemeDetailPreviewType,
  ThemeDetailSelectorType,
} from '@usertour/types';

export const getThemeDetailSelectorTypes = (
  t: (key: string) => string,
): ThemeDetailSelectorType[] => [
  {
    name: t('themeBuilder.previewTypes.tooltip'),
    type: ThemeDetailPreviewType.TOOLTIP,
  },
  {
    name: t('themeBuilder.previewTypes.modal'),
    type: ThemeDetailPreviewType.MODAL,
  },
  {
    name: t('themeBuilder.previewTypes.launcherIcon'),
    type: ThemeDetailPreviewType.LAUNCHER_ICON,
  },
  {
    name: t('themeBuilder.previewTypes.launcherBeacon'),
    type: ThemeDetailPreviewType.LAUNCHER_BEACON,
  },
  {
    name: t('themeBuilder.previewTypes.checklist'),
    type: ThemeDetailPreviewType.CHECKLIST,
  },
  {
    name: t('themeBuilder.previewTypes.checklistLauncher'),
    type: ThemeDetailPreviewType.CHECKLIST_LAUNCHER,
  },
  {
    name: t('themeBuilder.previewTypes.nps'),
    type: ThemeDetailPreviewType.NPS,
  },
];

export const getDefaultChecklistData = (t: (key: string) => string): ChecklistData => ({
  buttonText: t('themeBuilder.checklistPreview.buttonText'),
  initialDisplay: ChecklistInitialDisplay.EXPANDED,
  completionOrder: ChecklistCompletionOrder.ANY,
  preventDismissChecklist: false,
  autoDismissChecklist: false,
  items: [
    {
      id: '1',
      name: t('themeBuilder.checklistPreview.item1Name'),
      description: t('themeBuilder.sections.checklist'),
      clickedActions: [],
      completeConditions: [],
      onlyShowTask: false,
      isCompleted: false,
      onlyShowTaskConditions: [],
      isVisible: true,
    },
    {
      id: '2',
      name: t('themeBuilder.checklistPreview.item2Name'),
      description: t('themeBuilder.sections.checklist'),
      clickedActions: [],
      completeConditions: [],
      onlyShowTask: false,
      isCompleted: false,
      onlyShowTaskConditions: [],
      isVisible: true,
    },
    {
      id: '3',
      name: t('themeBuilder.checklistPreview.item3Name'),
      description: t('themeBuilder.sections.checklist'),
      clickedActions: [],
      completeConditions: [],
      onlyShowTask: false,
      isCompleted: false,
      onlyShowTaskConditions: [],
      isVisible: true,
    },
  ],
  content: [],
});
