import { useAnalyticsContext } from '@/contexts/analytics-context';
import { Card, CardContent, CardHeader, CardTitle } from '@usertour-packages/card';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import { AnalyticsViewsByTask } from '@usertour/types';
import { AnalyticsTasksSkeleton } from './analytics-skeleton';
import { useTranslation } from 'react-i18next';

export const AnalyticsTasks = () => {
  const { analyticsData, loading } = useAnalyticsContext();
  const { t } = useTranslation();

  if (loading) {
    return <AnalyticsTasksSkeleton />;
  }

  const computeRate = (task: AnalyticsViewsByTask) => {
    if (!task.analytics.uniqueViews) {
      return 0;
    }
    return Math.round((task.analytics.uniqueCompletions / task.analytics.uniqueViews) * 100);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="space-between flex flex-row  items-center">
            <div className="grow">{t('contents.analytics.tasks.title')}</div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('contents.analytics.tasks.task')}</TableHead>
                <TableHead className="w-32">{t('contents.analytics.tasks.uniqueViews')}</TableHead>
                <TableHead className="w-32">
                  {t('contents.analytics.tasks.completionRate')}
                </TableHead>
                <TableHead className="w-3/5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyticsData?.viewsByTask ? (
                analyticsData?.viewsByTask.map((task: AnalyticsViewsByTask, index) => {
                  const rate = computeRate(task);
                  return (
                    <TableRow key={index} onClick={() => {}}>
                      <TableCell className="py-[1px]">{task.name}</TableCell>
                      <TableCell className="py-[1px]">{task.analytics.uniqueViews}</TableCell>
                      <TableCell className="py-[1px]">{rate}%</TableCell>
                      <TableCell className="py-[1px] px-0">
                        <div
                          className="bg-success h-10"
                          style={{
                            width: `${rate}%`,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    {t('contents.analytics.common.noResults')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
};

AnalyticsTasks.displayName = 'AnalyticsTasks';
