import { Label } from '@usertour-packages/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import { HelpTooltip } from '@usertour-packages/shared-components';
import { useTranslation } from 'react-i18next';

interface SequenceSelectProps {
  value?: string;
  onChange: (value: string) => void;
  zIndex: number;
}

const ORDINAL_ELEMENT_KEYS = [
  'contentBuilder.shared.selectElement.1',
  'contentBuilder.shared.selectElement.2',
  'contentBuilder.shared.selectElement.3',
  'contentBuilder.shared.selectElement.4',
  'contentBuilder.shared.selectElement.5',
] as const;

export const SequenceSelect = ({ value = '1st', onChange, zIndex }: SequenceSelectProps) => {
  const { t } = useTranslation();
  const options = [1, 2, 3, 4, 5].map((num) => ({
    value: `${num}st`,
    label: t(ORDINAL_ELEMENT_KEYS[num - 1]),
  }));

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex justify-start items-center space-x-1	">
        <Label>{t('contentBuilder.shared.ifMultipleMatches')}</Label>
        <HelpTooltip>{t('contentBuilder.shared.ifMultipleMatchesTooltip')}</HelpTooltip>
      </div>
      <Select onValueChange={onChange} defaultValue={value}>
        <SelectTrigger>
          <SelectValue placeholder={t('contentBuilder.shared.selectSequencePlaceholder')} />
        </SelectTrigger>
        <SelectContent style={{ zIndex }}>
          <SelectGroup>
            {options.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                <div className="flex">{label}</div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
