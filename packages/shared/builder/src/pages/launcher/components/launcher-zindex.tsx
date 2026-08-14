import { Input } from '@usertour-packages/input';
import { useTranslation } from 'react-i18next';
import { useLauncherContext } from '../../../contexts';

export const LauncherZIndex = () => {
  const { updateLocalData, localData } = useLauncherContext();
  const { t } = useTranslation();

  if (!localData) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <h1 className="text-sm">{t('contentBuilder.launcher.zIndex')}</h1>
      </div>

      <Input
        value={localData.zIndex}
        placeholder={!localData.zIndex ? t('contentBuilder.common.default') : undefined}
        onChange={(e) => {
          const value = Number.parseInt(e.target.value);
          updateLocalData({ zIndex: value || undefined });
        }}
      />
    </div>
  );
};

LauncherZIndex.displayName = 'LauncherZIndex';
