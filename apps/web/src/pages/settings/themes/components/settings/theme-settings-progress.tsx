import { ThemeSelectColor } from '@/components/molecules/theme/theme-select-color';
import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { ThemeSettingSelect } from '@/components/molecules/theme/theme-setting-select';
import { ProgressBarType, ProgressBarPosition } from '@usertour/types';
import { Label } from '@usertour-packages/label';
import { Switch } from '@usertour-packages/switch';
import { Alert, AlertDescription } from '@usertour-packages/alert';
import { useThemeSettingsContext } from '../theme-settings-panel';
import { WarningIcon } from '@usertour-packages/icons';
import { useTranslation } from 'react-i18next';

export const ThemeSettingsProgress = () => {
  const { t } = useTranslation();
  const { settings, setSettings, finalSettings } = useThemeSettingsContext();
  const update = (data: Partial<typeof settings.progress>) => {
    const { progress } = settings;
    setSettings((pre) => ({
      ...pre,
      progress: { ...progress, ...data },
    }));
  };

  const progressTypeItems = [
    { name: t('themeBuilder.options.progressBarType.fullWidth'), value: ProgressBarType.FULL_WIDTH },
    { name: t('themeBuilder.options.progressBarType.narrow'), value: ProgressBarType.NARROW },
    { name: t('themeBuilder.options.progressBarType.chainRounded'), value: ProgressBarType.CHAIN_ROUNDED },
    { name: t('themeBuilder.options.progressBarType.chainSquared'), value: ProgressBarType.CHAIN_SQUARED },
    { name: t('themeBuilder.options.progressBarType.dots'), value: ProgressBarType.DOTS },
    { name: t('themeBuilder.options.progressBarType.numbered'), value: ProgressBarType.NUMBERED },
  ];

  const positionItems = [
    { name: t('themeBuilder.options.progressBarPosition.top'), value: ProgressBarPosition.TOP },
    { name: t('themeBuilder.options.progressBarPosition.bottom'), value: ProgressBarPosition.BOTTOM },
  ];

  const showPositionSelector = settings.progress.type !== ProgressBarType.FULL_WIDTH;

  // Get the appropriate label and name for the height/size input based on progress type
  const getHeightInputProps = () => {
    switch (settings.progress.type) {
      case ProgressBarType.FULL_WIDTH:
        return { text: t('themeBuilder.fields.progress.progressBarHeight'), name: 'progress-bar-height' };
      case ProgressBarType.NARROW:
        return { text: t('themeBuilder.fields.progress.progressBarHeight'), name: 'progress-bar-height' };
      case ProgressBarType.CHAIN_ROUNDED:
        return { text: t('themeBuilder.fields.progress.chainHeight'), name: 'progress-bar-height' };
      case ProgressBarType.CHAIN_SQUARED:
        return { text: t('themeBuilder.fields.progress.chainHeight'), name: 'progress-bar-height' };
      case ProgressBarType.DOTS:
        return { text: t('themeBuilder.fields.progress.dotSize'), name: 'progress-bar-height' };
      case ProgressBarType.NUMBERED:
        return { text: t('themeBuilder.fields.progress.fontSize'), name: 'progress-bar-height' };
      default:
        return { text: t('themeBuilder.fields.progress.progressBarHeight'), name: 'progress-bar-height' };
    }
  };

  // Get current height value for the selected progress type
  const getCurrentHeight = () => {
    switch (settings.progress.type) {
      case ProgressBarType.FULL_WIDTH:
        return settings.progress.height;
      case ProgressBarType.NARROW:
        return settings.progress.narrowHeight;
      case ProgressBarType.CHAIN_ROUNDED:
        return settings.progress.chainRoundedHeight;
      case ProgressBarType.CHAIN_SQUARED:
        return settings.progress.chainSquaredHeight;
      case ProgressBarType.DOTS:
        return settings.progress.dotsHeight;
      case ProgressBarType.NUMBERED:
        return settings.progress.numberedHeight;
      default:
        return settings.progress.height;
    }
  };

  // Update height for the current progress type
  const updateHeight = (value: number) => {
    switch (settings.progress.type) {
      case ProgressBarType.FULL_WIDTH:
        update({ height: value });
        break;
      case ProgressBarType.NARROW:
        update({ narrowHeight: value });
        break;
      case ProgressBarType.CHAIN_ROUNDED:
        update({ chainRoundedHeight: value });
        break;
      case ProgressBarType.CHAIN_SQUARED:
        update({ chainSquaredHeight: value });
        break;
      case ProgressBarType.DOTS:
        update({ dotsHeight: value });
        break;
      case ProgressBarType.NUMBERED:
        update({ numberedHeight: value });
        break;
      default:
        update({ height: value });
        break;
    }
  };

  const heightInputProps = getHeightInputProps();

  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <div className="flex flex-row items-center space-x-2 h-8">
          <Label htmlFor="progress-switch" className="flex flex-col space-y-1">
            <span className="font-normal">{t('themeBuilder.fields.progress.showProgressBar')}</span>
          </Label>
          <Switch
            id="progress-switch"
            checked={settings.progress.enabled}
            className="data-[state=unchecked]:bg-input"
            onCheckedChange={(checked: boolean) => {
              update({ enabled: checked });
            }}
          />
        </div>

        {settings.progress.enabled && (
          <>
            <ThemeSettingSelect
              text={t('themeBuilder.fields.progress.progressBarType')}
              name="progress-bar-type"
              defaultValue={settings.progress.type}
              items={progressTypeItems}
              vertical={true}
              onValueChange={(value: string) => {
                const progressType = value as ProgressBarType;
                update({ type: progressType });
              }}
            />

            {showPositionSelector && (
              <ThemeSettingSelect
                text={t('themeBuilder.fields.progress.progressBarPosition')}
                name="progress-bar-position"
                defaultValue={settings.progress.position}
                items={positionItems}
                onValueChange={(value: string) => {
                  update({ position: value as ProgressBarPosition });
                }}
              />
            )}

            <ThemeSelectColor
              text={t('themeBuilder.fields.progress.progressBarColor')}
              name="progress-bar-color"
              defaultColor={settings.progress.color}
              showAutoButton={true}
              isAutoColor={settings.progress.color === 'Auto'}
              autoColor={finalSettings?.brandColor.background}
              onChange={(value: string) => {
                update({ color: value });
              }}
            />
            <ThemeSettingInput
              text={heightInputProps.text}
              name={heightInputProps.name}
              defaultValue={String(getCurrentHeight())}
              onChange={(value: string) => {
                updateHeight(Number(value));
              }}
            />
            {settings.progress.type !== ProgressBarType.FULL_WIDTH &&
              settings.progress.type !== ProgressBarType.NARROW && (
                <Alert variant="warning">
                  <WarningIcon className="w-4 h-4" />
                  <AlertDescription className="text-sm">
                    {t('themeBuilder.alerts.progressNonLinear')}
                  </AlertDescription>
                </Alert>
              )}
          </>
        )}
      </div>
    </div>
  );
};

ThemeSettingsProgress.displayName = 'ThemeSettingsProgress';
