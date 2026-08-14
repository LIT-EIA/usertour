import { ListSkeleton } from '@/components/molecules/skeleton';
import { useLocalizationListContext } from '@/contexts/localization-list-context';
import { Badge } from '@usertour-packages/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import { Localization } from '@usertour/types';
import { formatDate as format } from '@/utils/common';
import { useTranslation } from 'react-i18next';
import { LocalizationListAction } from './localization-list-action';

export const LocalizationListContent = () => {
  const { localizationList, loading } = useLocalizationListContext();
  const { t } = useTranslation();

  if (loading) {
    return <ListSkeleton />;
  }

  return (
    <>
      <div className="rounded-md border-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('settings.localizations.columns.code')}</TableHead>
              <TableHead>{t('settings.localizations.columns.name')}</TableHead>
              <TableHead>{t('settings.localizations.columns.createdAt')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {localizationList ? (
              localizationList?.map((localization: Localization) => (
                <TableRow className="cursor-pointer" key={localization.id} onClick={() => {}}>
                  <TableCell>{localization.code}</TableCell>
                  <TableCell>
                    {localization.name}{' '}
                    {localization.isDefault && <Badge variant={'success'}>{t('settings.localizations.defaultBadge')}</Badge>}
                  </TableCell>
                  <TableCell>{format(new Date(localization.createdAt), 'PPpp')}</TableCell>
                  <TableCell>
                    <LocalizationListAction localization={localization} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="h-24 text-center">{t('dataTable.noResults')}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

LocalizationListContent.displayName = 'LocalizationListContent';
