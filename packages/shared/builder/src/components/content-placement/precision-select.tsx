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

interface PrecisionSelectProps {
  value?: string;
  onChange: (value: string) => void;
  zIndex: number;
}

export const PrecisionSelect = ({ value, onChange, zIndex }: PrecisionSelectProps) => {
  const { t } = useTranslation();

  return (
    <div className="items-center space-y-2">
      <div className="flex justify-start items-center space-x-1">
        <Label>{t('contentBuilder.shared.precision.label')}</Label>
        <HelpTooltip>{t('contentBuilder.shared.precision.tooltip')}</HelpTooltip>
      </div>
      <Select onValueChange={onChange} defaultValue={value}>
        <SelectTrigger>
          <SelectValue placeholder={t('contentBuilder.shared.precision.selectPlaceholder')} />
        </SelectTrigger>
        <SelectContent style={{ zIndex }}>
          <SelectGroup>
            <SelectItem value="loosest">{t('contentBuilder.shared.precision.loosest')}</SelectItem>
            <SelectItem value="looser">{t('contentBuilder.shared.precision.looser')}</SelectItem>
            <SelectItem value="loose">{t('contentBuilder.shared.precision.loose')}</SelectItem>
            <SelectItem value="strict">{t('contentBuilder.shared.precision.strict')}</SelectItem>
            <SelectItem value="stricter">{t('contentBuilder.shared.precision.stricter')}</SelectItem>
            <SelectItem value="strictest">{t('contentBuilder.shared.precision.strictest')}</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};
