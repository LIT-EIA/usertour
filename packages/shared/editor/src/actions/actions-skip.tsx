import { CloseIcon } from '@usertour-packages/icons';
import { ContentActionsRemove } from './actions-remove';
import { ActionsConditionRightContent, ContentActionsConditionIcon } from './actions-template';

export interface ContentActionsSkipProps {
  index: number;
  data?: {
    logic: string;
    type: string;
    stepIndex: string;
  };
  type?: string;
}

export const ContentActionsSkip = ({ index }: ContentActionsSkipProps) => {
  return (
    <ActionsConditionRightContent className="h-9 items-center w-fit pr-5">
      <ContentActionsConditionIcon>
        <CloseIcon width={16} height={16} />
      </ContentActionsConditionIcon>
      <span className="pr-1 text-sm">Skip</span> <ContentActionsRemove index={index} />
    </ActionsConditionRightContent>
  );
};

ContentActionsSkip.displayName = 'ContentActionsSkip';
