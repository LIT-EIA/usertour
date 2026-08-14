import { CloseCircleIcon } from '@usertour-packages/icons';
import { useTranslation } from 'react-i18next';
import { ContentActionsRemove } from './actions-remove';
import { ActionsConditionRightContent, ContentActionsConditionIcon } from './actions-template';

export interface ContentActionsDismissProps {
  data?: {
    logic: string;
    type: string;
    stepIndex: string;
  };
  type: string;
  index: number;
  text?: string;
}

export const ContentActionsDismiss = (props: ContentActionsDismissProps) => {
  const { index, text } = props;
  const { t } = useTranslation();
  const displayText = text ?? t('actions.types.flowDismiss.summary');

  return (
    <ActionsConditionRightContent className="h-9 items-center w-fit pr-5">
      <ContentActionsConditionIcon>
        <CloseCircleIcon width={16} height={16} />
      </ContentActionsConditionIcon>
      <span className="pr-1  text-sm">{displayText}</span> <ContentActionsRemove index={index} />
    </ActionsConditionRightContent>
  );
};

ContentActionsDismiss.displayName = 'ContentActionsDismiss';
