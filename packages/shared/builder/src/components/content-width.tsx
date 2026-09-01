import { HelpTooltip } from '@usertour-packages/shared-components';
import { useTranslation } from 'react-i18next';
import { InputNumber } from './shared/input';

export interface ContentWidthProps {
  width: number;
  onChange: (width: number) => void;
  type: 'modal' | 'tooltip' | 'checklist';
}

export const ContentWidth = (props: ContentWidthProps) => {
  const { t } = useTranslation();
  const { type, width, onChange } = props;

  const tooltipContent = {
    modal: t('contentBuilder.shared.widthTooltip.modal'),
    tooltip: t('contentBuilder.shared.widthTooltip.tooltip'),
    checklist: t('contentBuilder.shared.widthTooltip.checklist'),
  } as const;

  const handleWidthChange = (value: number) => {
    onChange(value);
  };

  return (
    <div className="space-y-3 ">
      <div className="flex justify-start items-center space-x-1	">
        <h1 className="text-sm">{t('contentBuilder.shared.width')}</h1>
        <HelpTooltip>{tooltipContent[type]}</HelpTooltip>
      </div>
      <InputNumber defaultNumber={width} onValueChange={handleWidthChange} />
    </div>
  );
};
ContentWidth.displayName = 'ContentWidth';
