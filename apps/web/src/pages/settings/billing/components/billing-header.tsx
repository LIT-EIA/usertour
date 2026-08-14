import { useTranslation } from 'react-i18next';

export const SettingsBillingHeader = () => {
  const { t } = useTranslation();
  return (
    <>
      <div className="relative ">
        <div className="flex flex-col space-y-2">
          <div className="flex flex-row justify-between ">
            <h3 className="text-2xl font-semibold tracking-tight">{t('settings.billing.title')}</h3>
          </div>
        </div>
      </div>
    </>
  );
};

SettingsBillingHeader.displayName = 'SettingsBillingHeader';
