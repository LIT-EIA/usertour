import { Card, CardContent, CardHeader, CardTitle } from '@usertour-packages/card';
import { Button } from '@usertour-packages/button';

import { BizSessionsDataTable } from './data-table';
import { ExportDropdownMenu } from './export-dropmenu';
import { DownloadIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const AnalyticsSessions = () => {
  const { t } = useTranslation();
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="space-between flex flex-row  items-center">
            <div className="grow">{t('contents.analytics.sessions.title')}</div>
            <ExportDropdownMenu>
              <Button variant="ghost" className="h-8 text-primary hover:text-primary">
                <DownloadIcon className="mr-1 w-4 h-4" />
                {t('contents.analytics.sessions.exportToCsv')}
              </Button>
            </ExportDropdownMenu>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BizSessionsDataTable />
        </CardContent>
      </Card>
    </>
  );
};

AnalyticsSessions.displayName = 'AnalyticsSessions';
