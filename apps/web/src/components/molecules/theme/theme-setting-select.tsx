import {
  Select,
  SelectContent,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import { HelpTooltip } from '@usertour-packages/shared-components';
import { cn } from '@usertour/helpers';
import { useTranslation } from 'react-i18next';

export type ThemeSettingSelectItemsType = {
  value: string;
  name: string;
};

type ThemeSelectProps = {
  text: string;
  placeholder?: string;
  defaultValue: string;
  name: string;
  items?: ThemeSettingSelectItemsType[];
  onValueChange?: (value: string) => void;
  tooltip?: string;
  vertical?: boolean;
};

export const ThemeSettingSelect = (props: ThemeSelectProps) => {
  const { t } = useTranslation();
  const fontWeightItems: ThemeSettingSelectItemsType[] = [
    { value: '100', name: t('themeBuilder.options.fontWeight.thin') },
    { value: '200', name: t('themeBuilder.options.fontWeight.extraLight') },
    { value: '300', name: t('themeBuilder.options.fontWeight.light') },
    { value: '400', name: t('themeBuilder.options.fontWeight.normal') },
    { value: '500', name: t('themeBuilder.options.fontWeight.medium') },
    { value: '600', name: t('themeBuilder.options.fontWeight.semibold') },
    { value: '700', name: t('themeBuilder.options.fontWeight.bold') },
    { value: '800', name: t('themeBuilder.options.fontWeight.extraBold') },
    { value: '900', name: t('themeBuilder.options.fontWeight.black') },
  ];
  const {
    text,
    placeholder = '',
    defaultValue,
    onValueChange,
    name,
    items = fontWeightItems,
    tooltip,
    vertical = false,
  } = props;
  return (
    <div className={cn('flex', vertical ? 'flex-col' : 'flex-row')}>
      <div className="text-sm grow flex flex-row items-center space-x-1">
        <label htmlFor={name} className="block text-sm leading-9">
          {text}
        </label>
        {tooltip && <HelpTooltip>{tooltip}</HelpTooltip>}
      </div>
      <div className={cn('relative', vertical ? 'w-full' : 'flex-none w-36')}>
        <Select defaultValue={defaultValue} onValueChange={onValueChange}>
          <SelectTrigger className="justify-start flex h-8" id={name}>
            <div className="grow text-left">
              <SelectValue placeholder={placeholder} />
            </div>
          </SelectTrigger>
          <SelectPortal>
            <SelectContent>
              {items.map((item, index) => {
                return (
                  <SelectItem key={index} value={item.value}>
                    {item.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </SelectPortal>
        </Select>
      </div>
    </div>
  );
};

ThemeSettingSelect.displayName = 'ThemeSettingSelect';
