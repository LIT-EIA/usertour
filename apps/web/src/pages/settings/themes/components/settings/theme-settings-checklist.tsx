import { ThemeSelectColor } from '@/components/molecules/theme/theme-select-color';
import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { ThemeSettingSelect } from '@/components/molecules/theme/theme-setting-select';
import { ModalPosition } from '@usertour/types';
import { useThemeSettingsContext } from '../theme-settings-panel';
import { useTranslation } from 'react-i18next';

export const ThemeSettingsChecklist = () => {
  const { t } = useTranslation();
  const placementItems = [
    { name: t('themeBuilder.options.placementCornerCenter.topLeft'), value: ModalPosition.LeftTop },
    { name: t('themeBuilder.options.placementCornerCenter.topRight'), value: ModalPosition.RightTop },
    { name: t('themeBuilder.options.placementCornerCenter.bottomLeft'), value: ModalPosition.LeftBottom },
    { name: t('themeBuilder.options.placementCornerCenter.bottomRight'), value: ModalPosition.RightBottom },
    { name: t('themeBuilder.options.placementCornerCenter.center'), value: ModalPosition.Center },
  ];

  const textDecorationItems = [
    { name: t('themeBuilder.options.textDecoration.none'), value: 'none' },
    { name: t('themeBuilder.options.textDecoration.lineThrough'), value: 'line-through' },
  ];

  const { settings, setSettings, finalSettings } = useThemeSettingsContext();

  // Update checklist settings
  const update = (data: Partial<typeof settings.checklist>) => {
    const { checklist } = settings;
    setSettings((pre) => ({
      ...pre,
      checklist: { ...checklist, ...data },
    }));
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSettingInput
          text={t('themeBuilder.fields.common.width')}
          name="checklist-width"
          defaultValue={String(settings.checklist.width)}
          tooltip={t('themeBuilder.tooltips.checklistWidth')}
          onChange={(value: string) => {
            update({ width: Number(value) });
          }}
        />
        <ThemeSettingSelect
          text={t('themeBuilder.fields.common.placement')}
          name="checklist-placement"
          items={placementItems}
          tooltip={t('themeBuilder.tooltips.checklistPlacement')}
          defaultValue={settings.checklist.placement.position}
          onValueChange={(value: string) => {
            update({
              placement: {
                ...settings.checklist.placement,
                position: value as ModalPosition,
              },
            });
          }}
        />
        <ThemeSettingInput
          text={t('themeBuilder.fields.common.offsetRight')}
          name="checklist-offset-x"
          tooltip={t('themeBuilder.tooltips.checklistOffsetX')}
          defaultValue={String(settings.checklist.placement.positionOffsetX)}
          onChange={(value: string) => {
            update({
              placement: {
                ...settings.checklist.placement,
                positionOffsetX: Number(value),
              },
            });
          }}
        />
        <ThemeSettingInput
          text={t('themeBuilder.fields.common.offsetBottom')}
          name="checklist-offset-y"
          defaultValue={String(settings.checklist.placement.positionOffsetY)}
          tooltip={t('themeBuilder.tooltips.checklistOffsetY')}
          onChange={(value: string) => {
            update({
              placement: {
                ...settings.checklist.placement,
                positionOffsetY: Number(value),
              },
            });
          }}
        />
        <ThemeSettingInput
          text={t('themeBuilder.fields.common.zIndex')}
          name="checklist-z-index"
          disableUnit={true}
          placeholder={t('themeBuilder.placeholders.auto')}
          tooltip={t('themeBuilder.tooltips.checklistZIndex')}
          defaultValue={settings.checklist.zIndex ? String(settings.checklist.zIndex) : ''}
          onChange={(value: string) => {
            const numValue = value === '' ? undefined : Number(value);
            update({ zIndex: numValue });
          }}
        />
        <ThemeSelectColor
          text={t('themeBuilder.fields.checklist.checkmarkColor')}
          name="checklist-checkmark-color"
          defaultColor={settings.checklist.checkmarkColor}
          showAutoButton={true}
          isAutoColor={settings.checklist.checkmarkColor === 'Auto'}
          autoColor={finalSettings?.checklist.checkmarkColor}
          onChange={(value: string) => {
            update({ checkmarkColor: value });
          }}
        />
        <ThemeSettingSelect
          text={t('themeBuilder.fields.checklist.completedTaskTextDecoration')}
          name="checklist-completed-task-text-decoration"
          items={textDecorationItems}
          tooltip={t('themeBuilder.tooltips.checklistCompletedTaskDecoration')}
          defaultValue={settings.checklist.completedTaskTextDecoration ?? 'none'}
          vertical={true}
          onValueChange={(value: string) => {
            update({
              completedTaskTextDecoration: value,
            });
          }}
        />
      </div>
    </div>
  );
};

ThemeSettingsChecklist.displayName = 'ThemeSettingsChecklist';
