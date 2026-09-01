import { CloseIcon } from '@usertour-packages/icons';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <ActionsConditionRightContent className="h-9 items-center w-fit pr-5">
      <ContentActionsConditionIcon>
        <CloseIcon width={16} height={16} />
      </ContentActionsConditionIcon>
      <span className="pr-1 text-sm">{t('actions.types.skip.label')}</span>{' '}
      <ContentActionsRemove index={index} />
    </ActionsConditionRightContent>
  );
};

ContentActionsSkip.displayName = 'ContentActionsSkip';
