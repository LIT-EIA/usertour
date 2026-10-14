import { CloseIcon } from '@usertour-packages/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { useTranslation } from 'react-i18next';
import { useRulesGroupContext } from '../contexts/rules-group-context';
import { TooltipIconButton } from '../common/tooltip-icon-button';

type RulesRemoveProps = {
  index: number;
};
export const RulesRemove = (props: RulesRemoveProps) => {
  const { index } = props;
  const { t } = useTranslation();
  const { conditions, setNewConditions } = useRulesGroupContext();

  const handleOnClick = () => {
    const _conditions = [...conditions];
    _conditions.splice(index, 1);
    setNewConditions(_conditions);
  };
  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <TooltipIconButton
              label={t('conditions.actions.removeCondition')}
              onClick={handleOnClick}
              className="absolute top-1 right-1 cursor-pointer rounded-sm"
            >
              <CloseIcon width={18} height={18} aria-hidden="true" />
            </TooltipIconButton>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-foreground text-background">
            {t('conditions.actions.removeCondition')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
};

RulesRemove.displayName = 'RulesRemove';
