import { CloseIcon } from '@usertour-packages/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { useTranslation } from 'react-i18next';
import { useActionsGroupContext } from '../contexts/actions-group-context';

type ContentActionsRemoveProps = {
  index: number;
};
export const ContentActionsRemove = (props: ContentActionsRemoveProps) => {
  const { index } = props;
  const { t } = useTranslation();
  const { conditions, setNewConditions } = useActionsGroupContext();

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
            <button
              type="button"
              aria-label={t('actions.actions.removeAction')}
              // 24px target with the 18px icon where it was (WCAG 2.5.8)
              className="absolute top-0 right-0 h-6 w-6 inline-flex items-center justify-center cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={handleOnClick}
            >
              <CloseIcon width={18} height={18} aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-foreground text-background">
            {t('actions.actions.removeAction')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
};

ContentActionsRemove.displayName = 'ContentActionsRemove';
