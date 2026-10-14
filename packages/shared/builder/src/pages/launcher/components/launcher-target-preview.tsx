import { GearIcon } from '@radix-ui/react-icons';
import { ElementIcon } from '@usertour-packages/icons';
import { useTranslation } from 'react-i18next';
import { useLauncherContext } from '../../../contexts';

export const LauncherTargetPreview = () => {
  const { gotoLauncherTarget } = useLauncherContext();
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <h2 className="text-sm">{t('contentBuilder.launcher.target')}</h2>
      </div>

      <button
        type="button"
        className="flex w-full flex-row items-center justify-between cursor-pointer bg-background-700 p-3.5 rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        onClick={gotoLauncherTarget}
      >
        <span className="flex flex-row space-x-1 items-center">
          <ElementIcon className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm">{t('contentBuilder.launcher.targetSetting')}</span>
        </span>
        <GearIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
};

LauncherTargetPreview.displayName = 'LauncherTargetPreview';
