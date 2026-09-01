import { ThemeColorPicker } from '@/components/molecules/theme/theme-color-picker';
import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { ThemeSettingSelect } from '@/components/molecules/theme/theme-setting-select';
import { ModalPosition } from '@usertour/types';
import { useThemeSettingsContext } from '../theme-settings-panel';
import { useTranslation } from 'react-i18next';

export const ThemeSettingsChecklistLauncher = () => {
  const { t } = useTranslation();
  const placementItems = [
    { name: t('themeBuilder.options.placementCornerCenter.topLeft'), value: ModalPosition.LeftTop },
    {
      name: t('themeBuilder.options.placementCornerCenter.topRight'),
      value: ModalPosition.RightTop,
    },
    {
      name: t('themeBuilder.options.placementCornerCenter.bottomLeft'),
      value: ModalPosition.LeftBottom,
    },
    {
      name: t('themeBuilder.options.placementCornerCenter.bottomRight'),
      value: ModalPosition.RightBottom,
    },
    { name: t('themeBuilder.options.placementCornerCenter.center'), value: ModalPosition.Center },
  ];

  const { settings, setSettings, finalSettings } = useThemeSettingsContext();

  // Update launcher settings
  const update = (data: Partial<typeof settings.checklistLauncher>) => {
    const { checklistLauncher } = settings;
    setSettings((pre) => ({
      ...pre,
      checklistLauncher: { ...checklistLauncher, ...data },
    }));
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSettingInput
          text={t('themeBuilder.fields.common.height')}
          name="checklist-launcher-height"
          defaultValue={String(settings.checklistLauncher.height)}
          tooltip={t('themeBuilder.tooltips.checklistLauncherHeight')}
          onChange={(value: string) => {
            update({ height: Number(value) });
          }}
        />
        <ThemeSettingInput
          text={t('themeBuilder.fields.common.borderRadius')}
          name="checklist-launcher-border-radius"
          defaultValue={String(settings.checklistLauncher.borderRadius)}
          onChange={(value: string) => {
            update({
              borderRadius: Number(value),
            });
          }}
        />{' '}
        <ThemeSettingSelect
          text={t('themeBuilder.fields.common.fontWeight')}
          name="checklist-launcher-font-weight"
          defaultValue={String(settings.checklistLauncher.fontWeight)}
          onValueChange={(value: string) => {
            update({ fontWeight: Number(value) });
          }}
        />
        <ThemeSettingSelect
          text={t('themeBuilder.fields.common.placement')}
          name="checklist-launcher-placement"
          items={placementItems}
          tooltip={t('themeBuilder.tooltips.checklistLauncherPlacement')}
          defaultValue={settings.checklistLauncher.placement.position}
          onValueChange={(value: string) => {
            update({
              placement: {
                ...settings.checklistLauncher.placement,
                position: value as ModalPosition,
              },
            });
          }}
        />
        <ThemeSettingInput
          text={t('themeBuilder.fields.common.offsetRight')}
          name="checklist-launcher-offset-x"
          tooltip={t('themeBuilder.tooltips.checklistLauncherOffsetX')}
          defaultValue={String(settings.checklistLauncher.placement.positionOffsetX)}
          onChange={(value: string) => {
            update({
              placement: {
                ...settings.checklistLauncher.placement,
                positionOffsetX: Number(value),
              },
            });
          }}
        />
        <ThemeSettingInput
          text={t('themeBuilder.fields.common.offsetBottom')}
          name="checklist-launcher-offset-y"
          defaultValue={String(settings.checklistLauncher.placement.positionOffsetY)}
          tooltip={t('themeBuilder.tooltips.checklistLauncherOffsetY')}
          onChange={(value: string) => {
            update({
              placement: {
                ...settings.checklistLauncher.placement,
                positionOffsetY: Number(value),
              },
            });
          }}
        />{' '}
        <div className="space-y-1">
          <div className="text-sm">{t('themeBuilder.fields.common.fontColor')}</div>
          <div className="flex">
            <ThemeColorPicker
              defaultColor={settings.checklistLauncher.color.color}
              showAutoButton={true}
              isAutoColor={settings.checklistLauncher.color.color === 'Auto'}
              autoColor={finalSettings?.checklistLauncher.color.color}
              onChange={(color: string) => {
                update({
                  color: { ...settings.checklistLauncher.color, color },
                });
              }}
            />
          </div>
        </div>
        <div className="flex flex-row w-full">
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">{t('themeBuilder.fields.common.background')}</div>
            <ThemeColorPicker
              defaultColor={settings.checklistLauncher.color.background}
              className="rounded-r-none"
              showAutoButton={true}
              isAutoColor={settings.checklistLauncher.color.background === 'Auto'}
              autoColor={finalSettings?.checklistLauncher.color.background}
              onChange={(color: string) => {
                update({
                  color: {
                    ...settings.checklistLauncher.color,
                    background: color,
                  },
                });
              }}
            />
          </div>
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">{t('themeBuilder.fields.common.hover')}</div>
            <ThemeColorPicker
              defaultColor={settings.checklistLauncher.color.hover}
              className="rounded-none border-x-0"
              showAutoButton={true}
              isAutoColor={settings.checklistLauncher.color.hover === 'Auto'}
              autoColor={finalSettings?.checklistLauncher.color.hover}
              onChange={(color: string) => {
                update({
                  color: {
                    ...settings.checklistLauncher.color,
                    hover: color,
                  },
                });
              }}
            />
          </div>
          <div className="flex flex-col space-y-1 basis-1/3">
            <div className="text-sm">{t('themeBuilder.fields.common.active')}</div>
            <ThemeColorPicker
              defaultColor={settings.checklistLauncher.color.active}
              className="rounded-l-none"
              showAutoButton={true}
              isAutoColor={settings.checklistLauncher.color.active === 'Auto'}
              autoColor={finalSettings?.checklistLauncher.color.active}
              onChange={(color: string) => {
                update({
                  color: {
                    ...settings.checklistLauncher.color,
                    active: color,
                  },
                });
              }}
            />
          </div>
        </div>{' '}
        <div className="space-y-1">
          <div className="text-sm">
            {t('themeBuilder.fields.checklistLauncher.counterFontColor')}
          </div>
          <div className="flex">
            <ThemeColorPicker
              defaultColor={settings.checklistLauncher.counter.color}
              showAutoButton={true}
              isAutoColor={settings.checklistLauncher.counter.color === 'Auto'}
              autoColor={finalSettings?.checklistLauncher.counter.color}
              onChange={(color: string) => {
                update({
                  counter: { ...settings.checklistLauncher.counter, color },
                });
              }}
            />
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-sm">
            {t('themeBuilder.fields.checklistLauncher.counterBackgroundColor')}
          </div>
          <div className="flex">
            <ThemeColorPicker
              defaultColor={settings.checklistLauncher.counter.background}
              showAutoButton={true}
              isAutoColor={settings.checklistLauncher.counter.background === 'Auto'}
              autoColor={finalSettings?.checklistLauncher.counter.background}
              onChange={(color: string) => {
                update({
                  counter: {
                    ...settings.checklistLauncher.counter,
                    background: color,
                  },
                });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

ThemeSettingsChecklistLauncher.displayName = 'ThemeSettingsChecklistLauncher';
