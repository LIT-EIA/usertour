import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import { useApiContext } from '@/contexts/api-context';
import { AccessToken } from '@usertour-packages/shared-hooks';
import { ApiListAction } from './api-list-action';
import { useAppContext } from '@/contexts/app-context';
import { ListSkeleton } from '@/components/molecules/skeleton';
import { useTranslation } from 'react-i18next';

export const ApiListContent = () => {
  const { accessTokens, loading, isRefetching } = useApiContext();
  const { environment } = useAppContext();
  const { t } = useTranslation();

  if (loading || !environment || isRefetching) {
    return <ListSkeleton />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-1/2">{t('settings.api.columns.name')}</TableHead>
          <TableHead className="w-1/2">{t('settings.api.columns.key')}</TableHead>
          <TableHead className="w-[80px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {accessTokens?.map((token: AccessToken) => (
          <TableRow key={token.id}>
            <TableCell>{token.name}</TableCell>
            <TableCell>{token.accessToken}</TableCell>
            <TableCell>
              <ApiListAction token={token} environmentId={environment.id} />
            </TableCell>
          </TableRow>
        ))}
        {accessTokens?.length === 0 && (
          <TableRow>
            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
              {t('settings.api.empty')}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};
