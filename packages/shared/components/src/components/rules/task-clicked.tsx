import { TaskClickedIcon } from '@usertour-packages/icons';
import { useTranslation } from 'react-i18next';
import { RulesLogic } from './rules-logic';
import { RulesRemove } from './rules-remove';
import { RulesConditionIcon, RulesConditionRightContent } from './rules-template';
import { useRulesContext } from './rules-context';

export interface RulesTaskIsClickedProps {
  index: number;
  type: string;
  data?: any;
}

export const RulesTaskIsClicked = (props: RulesTaskIsClickedProps) => {
  const { index } = props;
  const { disabled } = useRulesContext();
  const { t } = useTranslation();

  return (
    <div className="flex flex-row space-x-3">
      <RulesLogic index={index} disabled={disabled} />
      <RulesConditionRightContent className="items-center" disabled={disabled}>
        <RulesConditionIcon>
          <TaskClickedIcon width={16} height={16} />
        </RulesConditionIcon>
        <div className="grow pr-6 text-sm  ">{t('conditions.types.taskClicked.summary')}</div>
        <RulesRemove index={index} />
      </RulesConditionRightContent>
    </div>
  );
};

RulesTaskIsClicked.displayName = 'RulesTaskIsClicked';
