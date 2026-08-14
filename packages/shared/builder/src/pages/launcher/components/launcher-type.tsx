import { EXTENSION_SIDEBAR_MAIN } from '@usertour-packages/constants';
import { Input } from '@usertour-packages/input';
import { LauncherDataType, LauncherIconSource } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { LauncherContentType, IconPicker } from '../../../components/';
import { useLauncherContext } from '../../../contexts';

export const LauncherType = () => {
  const { updateLocalData, zIndex, localData } = useLauncherContext();
  const { t } = useTranslation();
  const sidebarZIndex = zIndex + EXTENSION_SIDEBAR_MAIN;

  if (!localData) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <h1 className="text-sm">{t('contentBuilder.launcher.appearance')}</h1>
      </div>

      <LauncherContentType
        type={localData.type}
        zIndex={sidebarZIndex}
        onChange={(value) => {
          updateLocalData({ type: value });
        }}
      />

      {localData.type === LauncherDataType.ICON && (
        <IconPicker
          type={localData.iconType}
          iconSource={localData.iconSource ?? LauncherIconSource.BUILTIN}
          iconUrl={localData.iconUrl}
          zIndex={sidebarZIndex}
          onChange={({ iconType, iconSource, iconUrl }) => {
            updateLocalData({
              iconType: iconType ?? localData.iconType,
              iconSource: iconSource ?? localData.iconSource,
              iconUrl,
            });
          }}
        />
      )}

      {localData.type === LauncherDataType.BUTTON && (
        <Input
          value={localData.buttonText ?? ''}
          placeholder={t('contentBuilder.launcher.buttonText')}
          onChange={(e) => {
            updateLocalData({ buttonText: e.target.value || undefined });
          }}
        />
      )}
    </div>
  );
};

LauncherType.displayName = 'LauncherType';
