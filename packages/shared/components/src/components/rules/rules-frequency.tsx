import { ChevronDownIcon, QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { Input } from '@usertour-packages/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import {
  ContentDataType,
  Frequency,
  FrequencyUnits,
  RulesFrequencyValue,
  RulesFrequencyValueAtLeast,
  RulesFrequencyValueEvery,
} from '@usertour/types';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { HelpTooltip } from '../common/help-tooltip';

const buildItemsMapping = (t: TFunction) => [
  { key: Frequency.ONCE, value: t('conditions.standalone.frequency.units.once') },
  { key: Frequency.MULTIPLE, value: t('conditions.standalone.frequency.units.multiple') },
  { key: Frequency.UNLIMITED, value: t('conditions.standalone.frequency.units.unlimited') },
];
const timesList = [
  FrequencyUnits.DAYES,
  FrequencyUnits.HOURS,
  FrequencyUnits.SECONDS,
  FrequencyUnits.MINUTES,
];
const getUnitLabel = (t: TFunction, unit: FrequencyUnits) =>
  t(`conditions.standalone.frequency.unit.${unit}`);

interface RulesFrequencyUnitsProps {
  frequency: Frequency;
  onChange?: (frequency: Frequency) => void;
  contentType: ContentDataType;
  disabled?: boolean;
}
const RulesFrequencyUnits = (props: RulesFrequencyUnitsProps) => {
  const { frequency: _frequency, onChange, contentType, disabled = false } = props;
  const { t } = useTranslation();
  const itemsMapping = useMemo(() => buildItemsMapping(t), [t]);

  const handleValueChange = (value: string) => {
    setFrequency(value as Frequency);
    if (onChange) {
      onChange(value as Frequency);
    }
  };
  const [frequency, setFrequency] = useState<Frequency>(_frequency);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <div className="flex flex-row items-center space-x-2">
          <div className="flex flex-row items-center space-x-2 text-sm text-primary cursor-pointer w-fit">
            <span>{itemsMapping.find((item) => item.key === frequency)?.value}</span>
            <ChevronDownIcon width={16} height={16} />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <QuestionMarkCircledIcon />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-foreground text-background">
                {t('conditions.standalone.frequency.unitsTooltip', { contentType })}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup value={frequency} onValueChange={handleValueChange}>
          {itemsMapping.map((item) => (
            <DropdownMenuRadioItem value={item.key} key={item.key}>
              {item.value}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface RulesFrequencyEveryProps {
  frequency: Frequency;
  defaultValue: RulesFrequencyValueEvery;
  onChange?: (value: RulesFrequencyValueEvery) => void;
  contentType: ContentDataType;
  disabled?: boolean;
}
const RulesFrequencyEvery = (props: RulesFrequencyEveryProps) => {
  const { defaultValue, frequency, onChange, contentType, disabled = false } = props;
  const { t } = useTranslation();
  const [data, setData] = useState<RulesFrequencyValueEvery>(defaultValue);

  const update = (params: Partial<RulesFrequencyValueEvery>) => {
    setData((pre) => {
      const v = { ...pre, ...params };
      if (onChange) {
        onChange(v);
      }
      return v;
    });
  };

  const handleTimesInputOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    update({ times: Number.parseInt(e.target.value) });
  };
  const handleDurationInputOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    update({ duration: Number.parseInt(e.target.value) });
  };
  const handleUnitOnChange = (value: string) => {
    update({ unit: value as FrequencyUnits });
  };

  const EveryTimes = (props: { disabled?: boolean }) => {
    const { disabled = false } = props;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <div className="flex flex-row items-center space-x-2 text-sm text-primary cursor-pointer">
            <span>{getUnitLabel(t, data.unit)}</span>
            <ChevronDownIcon width={16} height={16} />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup value={data.unit} onValueChange={handleUnitOnChange}>
            {timesList.map((v) => (
              <DropdownMenuRadioItem value={v} key={v}>
                {getUnitLabel(t, v)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  if (frequency === Frequency.ONCE) {
    return <></>;
  }

  if (frequency === Frequency.MULTIPLE) {
    return (
      <div className="flex flex-row items-center space-x-2">
        <Input
          type="text"
          id={'border-width'}
          name={'Border width'}
          onChange={handleTimesInputOnChange}
          value={data.times}
          disabled={disabled}
          className="rounded-lg text-sm w-16 h-6 "
          placeholder={''}
        />
        <span className="text-sm">{t('conditions.standalone.frequency.timesComma')} </span>
        <Input
          type="text"
          id={'border-width'}
          name={'Border width'}
          onChange={handleDurationInputOnChange}
          value={data.duration}
          disabled={disabled}
          className="rounded-lg text-sm w-16 h-6 "
          placeholder={''}
        />
        <EveryTimes disabled={disabled} />
        <span className="text-sm">{t('conditions.standalone.frequency.apart')} </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <QuestionMarkCircledIcon />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-foreground text-background">
              <p>
                {t('conditions.standalone.frequency.multipleTooltip', {
                  contentType,
                  times: data.times,
                  duration: data.duration,
                  unit: getUnitLabel(t, data.unit),
                })}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }
  return (
    <div className="flex flex-row items-center space-x-2">
      <span className="text-sm">{t('conditions.standalone.frequency.every')} </span>
      <Input
        type="text"
        id={'border-width'}
        name={'Border width'}
        onChange={handleDurationInputOnChange}
        value={data.duration}
        className="rounded-lg text-sm w-16 h-6 "
        placeholder={''}
      />
      <EveryTimes />
      <HelpTooltip>
        {t('conditions.standalone.frequency.unlimitedTooltip', {
          contentType,
          duration: data.duration,
          unit: getUnitLabel(t, data.unit),
        })}
      </HelpTooltip>
    </div>
  );
};

interface RulesFrequencyAtLeastProps {
  defaultValue: RulesFrequencyValueAtLeast;
  onChange?: (value: RulesFrequencyValueAtLeast) => void;
  contentType: ContentDataType;
  disabled?: boolean;
}

const RulesFrequencyAtLeast = (props: RulesFrequencyAtLeastProps) => {
  const { defaultValue, onChange, contentType, disabled = false } = props;
  const { t } = useTranslation();
  const [data, setData] = useState<RulesFrequencyValueAtLeast>(defaultValue);

  const update = (params: Partial<RulesFrequencyValueAtLeast>) => {
    setData((pre) => {
      const v = { ...pre, ...params };
      if (onChange) {
        onChange(v);
      }
      return v;
    });
  };
  const handleInputOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    update({ duration: Number.parseInt(e.target.value) });
  };
  const handleUnitOnChange = (value: string) => {
    update({ unit: value as FrequencyUnits });
  };

  return (
    <div className="flex flex-row items-center space-x-2">
      <span className="text-sm">{t('conditions.standalone.frequency.atLeast')}</span>
      <Input
        type="text"
        id={'border-width'}
        name={'Border width'}
        onChange={handleInputOnChange}
        disabled={disabled}
        value={data.duration}
        className="rounded-lg text-sm w-16 h-6 "
        placeholder={''}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <div className="flex flex-row items-center space-x-2 text-sm text-primary cursor-pointer">
            <span>{getUnitLabel(t, data.unit)}</span>
            <ChevronDownIcon width={16} height={16} />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup value={data.unit} onValueChange={handleUnitOnChange}>
            {timesList.map((v) => (
              <DropdownMenuRadioItem value={v} key={v}>
                {getUnitLabel(t, v)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="text-sm">
        {t('conditions.standalone.frequency.afterAny', { contentType })}
      </span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <QuestionMarkCircledIcon />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs bg-foreground text-background">
            {t('conditions.standalone.frequency.atLeastTooltip', { contentType })}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

const initialValue: RulesFrequencyValue = {
  frequency: Frequency.ONCE,
  every: {
    times: 0,
    duration: 0,
    unit: FrequencyUnits.DAYES,
  },
  atLeast: {
    duration: 0,
    unit: FrequencyUnits.DAYES,
  },
};

export interface RulesFrequencyProps {
  defaultValue?: RulesFrequencyValue;
  onChange: (value: RulesFrequencyValue) => void;
  showAtLeast?: boolean;
  contentType?: ContentDataType;
  disabled?: boolean;
}
export const RulesFrequency = (props: RulesFrequencyProps) => {
  const {
    onChange,
    defaultValue,
    showAtLeast = true,
    contentType = ContentDataType.FLOW,
    disabled = false,
  } = props;

  const initialData: RulesFrequencyValue = {
    ...(defaultValue || initialValue),
    atLeast: showAtLeast ? (defaultValue || initialValue).atLeast : undefined,
  };
  const [data, setData] = useState<RulesFrequencyValue>(initialData);

  useEffect(() => {
    if (!defaultValue) {
      onChange(initialData);
    }
  }, [defaultValue, initialData, onChange]);

  const update = (value: Partial<RulesFrequencyValue>) => {
    setData((pre) => {
      const v = { ...pre, ...value };
      onChange(v);
      return v;
    });
  };

  return (
    <>
      <RulesFrequencyUnits
        frequency={data.frequency}
        onChange={(v) => {
          update({ frequency: v });
        }}
        contentType={contentType}
        disabled={disabled}
      />
      <RulesFrequencyEvery
        frequency={data.frequency}
        defaultValue={data.every}
        onChange={(value) => {
          update({ every: value });
        }}
        contentType={contentType}
        disabled={disabled}
      />
      {showAtLeast && data.atLeast && (
        <RulesFrequencyAtLeast
          defaultValue={data.atLeast}
          onChange={(value) => {
            update({ atLeast: value });
          }}
          contentType={contentType}
          disabled={disabled}
        />
      )}
    </>
  );
};

RulesFrequency.displayName = 'RulesFrequency';
