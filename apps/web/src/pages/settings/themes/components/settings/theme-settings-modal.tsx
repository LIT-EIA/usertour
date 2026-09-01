import { ThemeSettingInput } from '@/components/molecules/theme/theme-setting-input';
import { useThemeSettingsContext } from '../theme-settings-panel';
import { useTranslation } from 'react-i18next';

export const ThemeSettingsModal = () => {
  const { t } = useTranslation();
  const { settings, setSettings } = useThemeSettingsContext();
  const update = (data: Partial<typeof settings.modal>) => {
    const { modal } = settings;
    setSettings((pre) => ({
      ...pre,
      modal: { ...modal, ...data },
    }));
  };
  return (
    <div className="flex flex-col space-y-4">
      <div className="py-[15px] px-5 space-y-3">
        <ThemeSettingInput
          text={t('themeBuilder.fields.common.width')}
          name="modal-width"
          defaultValue={String(settings.modal.width)}
          onChange={(value: string) => {
            update({ width: Number(value) });
          }}
        />
        <ThemeSettingInput
          text={t('themeBuilder.fields.common.padding')}
          name="modal-padding"
          defaultValue={String(settings.modal.padding)}
          onChange={(value: string) => {
            update({ padding: Number(value) });
          }}
        />
      </div>
    </div>
  );
};

ThemeSettingsModal.displayName = 'ThemeSettingsModal';
