import { QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import { Input } from '@usertour-packages/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { ChangeEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RulesError, RulesErrorAnchor, RulesErrorContent } from './rules-error';

export interface RulesCurrentTimeProps {
  defaultValue: number;
  onValueChange: (value: number) => void;
  maxSeconds?: number;
  disabled?: boolean;
}

export const RulesWait = (props: RulesCurrentTimeProps) => {
  const { defaultValue, onValueChange, maxSeconds = 300, disabled = false } = props;
  const { t } = useTranslation();
  const [openError, setOpenError] = useState(false);
  const [inputValue, setInputValue] = useState<number>(defaultValue ?? 0);

  const handleInputOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value);
    setInputValue(value);
    if (value > maxSeconds) {
      setOpenError(true);
    } else {
      onValueChange(value);
      setOpenError(false);
    }
  };

  return (
    <RulesError open={openError}>
      <div className="flex flex-row space-x-3">
        <div className="flex flex-row items-center space-x-2 h-9 space-x-2 items-center">
          <span className="text-sm">{t('conditions.standalone.wait.before')}</span>
          <RulesErrorAnchor asChild>
            <Input
              type="text"
              name={'Border width'}
              onChange={handleInputOnChange}
              value={inputValue}
              className="rounded-lg text-sm w-16 h-6 "
              placeholder={''}
              disabled={disabled}
            />
          </RulesErrorAnchor>
          <div className="text-muted-foreground text-sm">
            {t('conditions.standalone.wait.afterLabel')}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <QuestionMarkCircledIcon className="ml-1 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                {t('conditions.standalone.wait.tooltip')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <RulesErrorContent className="w-60">
          {t('conditions.standalone.wait.error', {
            max: maxSeconds,
            minutes: Math.floor(maxSeconds / 60),
          })}
        </RulesErrorContent>
      </div>
    </RulesError>
  );
};

RulesWait.displayName = 'RulesWait';
