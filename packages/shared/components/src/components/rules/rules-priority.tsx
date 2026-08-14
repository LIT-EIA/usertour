import { ChevronDownIcon, QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { ContentPriority } from '@usertour/types';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface RulesPriorityProps {
  defaltValue: ContentPriority;
  onChange: (value: string) => void;
  disabled?: boolean;
}
export const RulesPriority = (props: RulesPriorityProps) => {
  const { defaltValue = ContentPriority.MEDIUM, onChange, disabled = false } = props;
  const { t } = useTranslation();
  const itemsMapping = useMemo(
    () => [
      { key: ContentPriority.HIGHEST, value: t('conditions.standalone.priority.highest') },
      { key: ContentPriority.HIGH, value: t('conditions.standalone.priority.high') },
      { key: ContentPriority.MEDIUM, value: t('conditions.standalone.priority.medium') },
      { key: ContentPriority.LOW, value: t('conditions.standalone.priority.low') },
      { key: ContentPriority.LOWEST, value: t('conditions.standalone.priority.lowest') },
    ],
    [t],
  );
  const [value, setValue] = useState(defaltValue);

  const handleOnValueChange = (value: string) => {
    setValue(value as ContentPriority);
    onChange(value as ContentPriority);
  };
  return (
    <div className="flex flex-row items-center space-x-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <div className="flex flex-row items-center space-x-2 text-sm text-primary cursor-pointer w-fit">
            <span>{itemsMapping.find((item) => item.key === value)?.value}</span>
            <ChevronDownIcon width={16} height={16} />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup value={value} onValueChange={handleOnValueChange}>
            {itemsMapping.map((item) => (
              <DropdownMenuRadioItem value={item.key} key={item.key}>
                {item.value}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <QuestionMarkCircledIcon />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-foreground text-background">
            <p>{t('conditions.standalone.priority.tooltip')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

RulesPriority.displayName = 'RulesPriority';
