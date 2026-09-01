import { useAnalyticsContext } from '@/contexts/analytics-context';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-packages/card';
import { AnalyticsGrowthIcon, AnalyticsUserIcon } from '@usertour-packages/icons';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { AnalyticsData, ContentDataType } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { AnalyticsViewsSkeleton } from './analytics-skeleton';

interface AnalyticsViewsProps {
  analyticsData: AnalyticsData;
}

interface AnalyticsCardProps {
  title: string;
  tooltip: string;
  value: string | number;
  icon: React.ReactNode;
}

const AnalyticsCard = ({ title, tooltip, value, icon }: AnalyticsCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium flex flex-row items-center gap-1">
        {title}
        <QuestionTooltip>{tooltip}</QuestionTooltip>
      </CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const calculateCompletionRate = (completions: number, views: number): string => {
  if (!views) return '0%';
  return `${Math.floor((completions / views) * 100)}%`;
};

interface AnalyticsViewsGridProps {
  analyticsData: AnalyticsData;
  tooltips: {
    uniqueViews: string;
    uniqueCompletionRate: string;
    totalViews: string;
    totalCompletionRate: string;
  };
  titles?: {
    uniqueViews: string;
    uniqueCompletionRate: string;
    totalViews: string;
    totalCompletionRate: string;
  };
}

const AnalyticsViewsGrid = ({ analyticsData, tooltips, titles }: AnalyticsViewsGridProps) => {
  const { t } = useTranslation();
  const resolvedTitles = titles ?? {
    uniqueViews: t('contents.analytics.views.uniqueViews'),
    uniqueCompletionRate: t('contents.analytics.views.uniqueCompletionRate'),
    totalViews: t('contents.analytics.views.totalViews'),
    totalCompletionRate: t('contents.analytics.views.totalCompletionRate'),
  };
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <AnalyticsCard
        title={resolvedTitles.uniqueViews}
        tooltip={tooltips.uniqueViews}
        value={analyticsData?.uniqueViews || 0}
        icon={<AnalyticsUserIcon className="h-4 w-4 text-muted-foreground" />}
      />
      <AnalyticsCard
        title={resolvedTitles.uniqueCompletionRate}
        tooltip={tooltips.uniqueCompletionRate}
        value={calculateCompletionRate(
          analyticsData?.uniqueCompletions || 0,
          analyticsData?.uniqueViews || 0,
        )}
        icon={<AnalyticsGrowthIcon className="h-4 w-4 text-muted-foreground" />}
      />
      <AnalyticsCard
        title={resolvedTitles.totalViews}
        tooltip={tooltips.totalViews}
        value={analyticsData?.totalViews || 0}
        icon={<AnalyticsUserIcon className="h-4 w-4 text-muted-foreground" />}
      />
      <AnalyticsCard
        title={resolvedTitles.totalCompletionRate}
        tooltip={tooltips.totalCompletionRate}
        value={calculateCompletionRate(
          analyticsData?.totalCompletions || 0,
          analyticsData?.totalViews || 0,
        )}
        icon={<AnalyticsGrowthIcon className="h-4 w-4 text-muted-foreground" />}
      />
    </div>
  );
};

const LauncherAnalyticsViews = ({ analyticsData }: AnalyticsViewsProps) => {
  const { t } = useTranslation();
  return (
    <AnalyticsViewsGrid
      analyticsData={analyticsData}
      titles={{
        uniqueViews: t('contents.analytics.views.uniqueViews'),
        uniqueCompletionRate: t('contents.analytics.views.launcher.uniqueActivationRate'),
        totalViews: t('contents.analytics.views.totalViews'),
        totalCompletionRate: t('contents.analytics.views.launcher.totalActivationRate'),
      }}
      tooltips={{
        uniqueViews: t('contents.analytics.views.launcher.uniqueViewsTooltip'),
        uniqueCompletionRate: t('contents.analytics.views.launcher.uniqueActivationRateTooltip'),
        totalViews: t('contents.analytics.views.launcher.totalViewsTooltip'),
        totalCompletionRate: t('contents.analytics.views.launcher.totalActivationRateTooltip'),
      }}
    />
  );
};

const FlowAnalyticsViews = ({ analyticsData }: AnalyticsViewsProps) => {
  const { t } = useTranslation();
  return (
    <AnalyticsViewsGrid
      analyticsData={analyticsData}
      tooltips={{
        uniqueViews: t('contents.analytics.views.flow.uniqueViewsTooltip'),
        uniqueCompletionRate: t('contents.analytics.views.flow.uniqueCompletionRateTooltip'),
        totalViews: t('contents.analytics.views.flow.totalViewsTooltip'),
        totalCompletionRate: t('contents.analytics.views.flow.totalCompletionRateTooltip'),
      }}
    />
  );
};

const ChecklistAnalyticsViews = ({ analyticsData }: AnalyticsViewsProps) => {
  const { t } = useTranslation();
  return (
    <AnalyticsViewsGrid
      analyticsData={analyticsData}
      tooltips={{
        uniqueViews: t('contents.analytics.views.checklist.uniqueViewsTooltip'),
        uniqueCompletionRate: t('contents.analytics.views.checklist.uniqueCompletionRateTooltip'),
        totalViews: t('contents.analytics.views.checklist.totalViewsTooltip'),
        totalCompletionRate: t('contents.analytics.views.checklist.totalCompletionRateTooltip'),
      }}
    />
  );
};

export const AnalyticsViews = () => {
  const { analyticsData, loading } = useAnalyticsContext();
  const { content } = useContentDetailContext();
  const contentType = content?.type;

  if (loading) {
    return <AnalyticsViewsSkeleton />;
  }

  if (!content || !analyticsData) {
    return null;
  }
  if (contentType === ContentDataType.LAUNCHER) {
    return <LauncherAnalyticsViews analyticsData={analyticsData} />;
  }
  if (contentType === ContentDataType.FLOW) {
    return <FlowAnalyticsViews analyticsData={analyticsData} />;
  }
  if (contentType === ContentDataType.CHECKLIST) {
    return <ChecklistAnalyticsViews analyticsData={analyticsData} />;
  }
  return null;
};

AnalyticsViews.displayName = 'AnalyticsViews';
