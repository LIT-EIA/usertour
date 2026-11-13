import { CalendarDateRangePicker } from './date-range-picker';
import { useTranslation } from 'react-i18next';

export const AnalyticsHeader = () => {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold tracking-tight">{t('contents.analytics.header.overview')}</h2>
        <div className="flex items-center space-x-2">
          <CalendarDateRangePicker />
        </div>
      </div>
    </>
  );
};

AnalyticsHeader.displayName = 'AnalyticsHeader';
