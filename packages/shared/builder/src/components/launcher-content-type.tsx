import { LauncherIcon } from '@usertour-packages/icons';
import { RiEyeOffFill, RiInformationFill, RiSquareFill } from '@remixicon/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import { LauncherDataType } from '@usertour/types';
import { useTranslation } from 'react-i18next';

interface LauncherTypeProps {
  type: LauncherDataType;
  zIndex: number;
  onChange: (value: LauncherDataType) => void;
}

export const LauncherContentType = ({ zIndex, type, onChange }: LauncherTypeProps) => {
  const { t } = useTranslation();

  const getLabel = (dataType: LauncherDataType) => {
    switch (dataType) {
      case LauncherDataType.BEACON:
        return t('contentBuilder.launcher.type.beacon');
      case LauncherDataType.ICON:
        return t('contentBuilder.launcher.type.icon');
      case LauncherDataType.BUTTON:
        return t('contentBuilder.launcher.type.button');
      case LauncherDataType.HIDDEN:
        return t('contentBuilder.launcher.type.hidden');
      default:
        return dataType;
    }
  };

  const getIcon = (dataType: LauncherDataType) => {
    const iconProps = { width: 16, height: 16 };
    switch (dataType) {
      case LauncherDataType.BEACON:
        return <LauncherIcon {...iconProps} />;
      case LauncherDataType.ICON:
        return <RiInformationFill size={16} className="text-current" />;
      case LauncherDataType.BUTTON:
        return <RiSquareFill size={16} className="text-current" />;
      case LauncherDataType.HIDDEN:
        return <RiEyeOffFill size={16} className="text-current" />;
    }
  };

  const getDescription = (dataType: LauncherDataType) => {
    switch (dataType) {
      case LauncherDataType.BEACON:
        return t('contentBuilder.launcher.type.beaconDescription');
      case LauncherDataType.ICON:
        return t('contentBuilder.launcher.type.iconDescription');
      case LauncherDataType.BUTTON:
        return t('contentBuilder.launcher.type.buttonDescription');
      case LauncherDataType.HIDDEN:
        return t('contentBuilder.launcher.type.hiddenDescription');
      default:
        return '';
    }
  };

  return (
    <Select value={type} onValueChange={onChange}>
      <SelectTrigger className="justify-start flex h-8">
        {getIcon(type)}
        <div className="grow text-left ml-2">
          <SelectValue placeholder="" asChild>
            <div className="capitalize">{getLabel(type)}</div>
          </SelectValue>
        </div>
      </SelectTrigger>

      <SelectContent style={{ zIndex }}>
        {Object.values(LauncherDataType).map((value) => (
          <SelectItem key={value} value={value} className="cursor-pointer">
            <div className="flex flex-col">
              <div className="flex flex-row space-x-1 items-center">
                {getIcon(value)}
                <span className="text-xs font-bold capitalize">{getLabel(value)}</span>
              </div>
              <div className="max-w-60 text-xs text-muted-foreground">{getDescription(value)}</div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
LauncherContentType.displayName = 'LauncherContentType';
