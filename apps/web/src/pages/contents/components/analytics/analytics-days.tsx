import { useAnalyticsContext } from '@/contexts/analytics-context';
import { useContentDetailContext } from '@/contexts/content-detail-context';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-packages/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@usertour-packages/chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@usertour-packages/tabs';
import { ContentDataType } from '@usertour/types';
import { formatDate } from '@/utils/common';
import { useEffect, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts';
import { AnalyticsDaysSkeleton } from './analytics-skeleton';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

// Add new function to generate chart configs
const generateChartConfig = (
  chartType: 'view' | 'rate',
  contentType: ContentDataType,
  t: TFunction,
): ChartConfig => {
  const isLauncher = contentType === ContentDataType.LAUNCHER;
  if (chartType === 'view') {
    return {
      uniqueViews: {
        label: t('contents.analytics.chart.uniqueViews'),
        color: 'hsl(var(--chart-1))',
      },
      uniqueCompletions: {
        label: isLauncher
          ? t('contents.analytics.chart.uniqueActivations')
          : t('contents.analytics.chart.uniqueCompletions'),
        color: 'hsl(var(--chart-2))',
      },
      totalViews: {
        label: t('contents.analytics.chart.totalViews'),
        color: 'hsl(var(--chart-3))',
      },
      totalCompletions: {
        label: isLauncher
          ? t('contents.analytics.chart.totalActivations')
          : t('contents.analytics.chart.totalCompletions'),
        color: 'hsl(var(--chart-4))',
      },
    };
  }

  return {
    unique: {
      label: isLauncher
        ? t('contents.analytics.views.launcher.uniqueActivationRate')
        : t('contents.analytics.views.uniqueCompletionRate'),
      color: 'hsl(var(--chart-1))',
    },
    total: {
      label: isLauncher
        ? t('contents.analytics.views.launcher.totalActivationRate')
        : t('contents.analytics.views.totalCompletionRate'),
      color: 'hsl(var(--chart-2))',
    },
  };
};

// Improve type safety for chart data
type ChartDataType = {
  date: string;
  totalViews: number;
  totalCompletions: number;
  uniqueViews: number;
  uniqueCompletions: number;
};

type RateChartDataType = {
  date: string;
  total: number;
  unique: number;
};

// Extract tooltip formatter to a reusable component
const TooltipFormatter = ({
  value,
  name,
  chartConfig,
  showPercentage = false,
}: {
  value: number;
  name: string;
  chartConfig: ChartConfig;
  showPercentage?: boolean;
}) => (
  <div className="flex flex-row w-[180px] items-center text-xs text-muted-foreground">
    <div className="grow">{chartConfig[name as keyof typeof chartConfig]?.label || name}</div>
    <div className="flex-none mx-2 font-medium tabular-nums text-foreground text-center w-6">
      {value}
      {showPercentage && <span className="font-normal text-muted-foreground">%</span>}
    </div>
  </div>
);

// Refactor chart components to be more DRY
const AnalyticsViewChart = ({
  chartData,
  chartConfig,
}: {
  chartData: ChartDataType[];
  chartConfig: ChartConfig;
}) => (
  <CardContent>
    <ChartContainer config={chartConfig} className="h-96 w-full">
      <ComposedChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <YAxis tickLine={false} tickMargin={10} axisLine={false} />
        <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <TooltipFormatter
                  value={Number(value)}
                  name={name as string}
                  chartConfig={chartConfig}
                />
              )}
            />
          }
          cursor={false}
        />
        <ChartLegend content={<ChartLegendContent />} />
        {Object.keys(chartConfig).map((key) => (
          <Bar key={key} dataKey={key} fill={`var(--color-${key})`} radius={4} />
        ))}
      </ComposedChart>
    </ChartContainer>
  </CardContent>
);

const AnalyticsRateChart = (props: {
  chartData: any;
  chartConfig: ChartConfig;
}) => {
  const { chartData, chartConfig } = props;
  return (
    <CardContent>
      <ChartContainer config={chartConfig} className="h-96 w-full">
        <ComposedChart accessibilityLayer data={chartData}>
          <CartesianGrid vertical={false} />
          <YAxis tickLine={false} tickMargin={10} axisLine={false} unit={'%'} />
          <XAxis
            dataKey="date"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            // tickFormatter={(value) => value.slice(0, 3)}
          />
          {/* <ChartTooltip
                content={<ChartTooltipContent indicator="line" />}
                cursor={false}
              /> */}
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <div className="flex flex-row w-[180px] items-center text-xs text-muted-foreground">
                    <div className="grow">
                      {chartConfig[name as keyof typeof chartConfig]?.label || name}
                    </div>
                    <div className="flex-none mx-2 font-medium tabular-nums text-foreground text-center w-6">
                      <>
                        {value}
                        <span className="font-normal text-muted-foreground">%</span>
                      </>
                    </div>
                  </div>
                )}
              />
            }
            cursor={false}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            dataKey="unique"
            type="monotone"
            stroke={'var(--color-unique)'}
            strokeWidth={2}
            dot={false}
          />
          <Line
            dataKey="total"
            type="monotone"
            stroke="var(--color-total)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ChartContainer>
    </CardContent>
  );
};

export const AnalyticsDays = () => {
  const { analyticsData, loading } = useAnalyticsContext();
  const { content } = useContentDetailContext();
  const contentType = content?.type;
  const [viewData, setViewData] = useState<ChartDataType[]>();
  const [rateData, setRateData] = useState<RateChartDataType[]>();
  const { t } = useTranslation();

  // Improve data transformation
  useEffect(() => {
    if (!analyticsData?.viewsByDay) return;

    const transformData = analyticsData.viewsByDay.map((view) => {
      const date = formatDate(new Date(view.date), 'PP');
      return {
        viewData: {
          date,
          uniqueViews: view.uniqueViews,
          uniqueCompletions: view.uniqueCompletions,
          totalViews: view.totalViews,
          totalCompletions: view.totalCompletions,
        },
        rateData: {
          date,
          unique: view.uniqueViews
            ? Math.round((view.uniqueCompletions / view.uniqueViews) * 100)
            : 0,
          total: view.totalViews ? Math.round((view.totalCompletions / view.totalViews) * 100) : 0,
        },
      };
    });

    setViewData(transformData.map((d) => d.viewData));
    setRateData(transformData.map((d) => d.rateData));
  }, [analyticsData]);

  if (loading) {
    return <AnalyticsDaysSkeleton />;
  }

  if (!contentType || !viewData || !rateData) {
    return null;
  }

  return (
    <>
      <Tabs defaultValue="views">
        <Card>
          <CardHeader>
            <CardTitle className="space-between flex flex-row  items-center">
              <div className="grow	">{t('contents.analytics.performance.title')}</div>
              <TabsList className="flex-none">
                <TabsTrigger value="views" className="relative">
                  {t('contents.analytics.chart.views')}
                </TabsTrigger>
                <TabsTrigger value="rate">{t('contents.analytics.chart.rate')}</TabsTrigger>
              </TabsList>
            </CardTitle>
            {/* <CardDescription>
              {dateRange && dateRange.from && formatDate(new Date(dateRange?.from), "PP")} - {dateRange && dateRange.to && formatDate(new Date(dateRange?.to), "PP")}
            </CardDescription> */}
          </CardHeader>
          <TabsContent value="views" className="border-none p-0 outline-none">
            <AnalyticsViewChart
              chartConfig={generateChartConfig('view', contentType, t)}
              chartData={viewData}
            />
          </TabsContent>
          <TabsContent value="rate" className="border-none p-0 outline-none">
            {/* <AnalyticsChart chartConfig={totalChartConfig} chartData={totalData} /> */}
            <AnalyticsRateChart
              chartConfig={generateChartConfig('rate', contentType, t)}
              chartData={rateData}
            />
          </TabsContent>
        </Card>
      </Tabs>
    </>
  );
};

AnalyticsDays.displayName = 'AnalyticsDays';
