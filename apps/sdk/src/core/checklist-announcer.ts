import { checklistCompletedItemsCount, checklistVisibleItemsCount } from '@usertour-packages/sdk';
import { ChecklistItemType } from '@usertour/types';
import { announce } from './live-region';
import { getTranslations } from './translations';

/** Announces newly completed tasks, even when the checklist is collapsed */
export const announceCompletedTasks = (
  currentItems: ChecklistItemType[],
  previousItems: ChecklistItemType[],
): void => {
  const completed = currentItems.filter(
    (item) =>
      item.isVisible !== false &&
      item.isCompleted &&
      previousItems.some((previous) => previous.id === item.id && !previous.isCompleted),
  );
  if (completed.length === 0) {
    return;
  }
  const strings = getTranslations();
  const done = checklistCompletedItemsCount(currentItems);
  const total = checklistVisibleItemsCount(currentItems);
  const names = completed.map((item) => item.name).join(', ');
  announce(strings.taskCompleted(names, strings.checklist.progress(done, total)), strings.lang);
};
