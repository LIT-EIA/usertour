import { ListSkeleton } from '@/components/molecules/skeleton';
import { useContentLocalizationListContext } from '@/contexts/content-localization-list-context';
import { useLocalizationListContext } from '@/contexts/localization-list-context';
import { useMutation } from '@apollo/client';
import { updateVersionLocationData } from '@usertour-packages/gql';
import { Switch } from '@usertour-packages/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import { VersionOnLocalization } from '@usertour/types';
import { cn } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { formatDate } from '@/utils/common';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const ContentLocalizationTable = () => {
  const { contentLocalizationList, loading, refetch } = useContentLocalizationListContext();
  const { localizationList } = useLocalizationListContext();
  const [mutation] = useMutation(updateVersionLocationData);
  const { toast } = useToast();
  const location = useLocation();
  const { t } = useTranslation();

  const handleOnCheckedChange = async (enabled: boolean, contentLocale: VersionOnLocalization) => {
    try {
      const { data } = await mutation({
        variables: {
          data: {
            localizationId: contentLocale.localizationId,
            versionId: contentLocale.versionId,
            localized: contentLocale.localized,
            backup: contentLocale.backup,
            enabled,
          },
        },
      });
      if (data.updateVersionLocationData.id) {
        await refetch();
        toast({
          variant: 'success',
          title: t('contents.localization.toast.applySuccess'),
        });
      }
    } catch (_) {
      toast({
        variant: 'destructive',
        title: t('contents.localization.toast.applyFailure'),
      });
    }
  };

  if (loading) {
    return <ListSkeleton />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-2/4">{t('contents.localization.taskTable.locale')}</TableHead>
          <TableHead className="w-1/4">{t('contents.localization.taskTable.status')}</TableHead>
          <TableHead className="w-1/4">{t('contents.localization.taskTable.updatedAt')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contentLocalizationList ? (
          contentLocalizationList.map((contentLocale: VersionOnLocalization) => (
            <TableRow key={contentLocale.id}>
              <TableCell>
                <Link
                  to={`${location.pathname}/${
                    localizationList?.find((locate) => locate.id === contentLocale.localizationId)
                      ?.locale
                  }`}
                  key={contentLocale.id}
                  className={cn('hover:text-primary hover:underline underline-offset-4')}
                >
                  {
                    localizationList?.find((locate) => locate.id === contentLocale.localizationId)
                      ?.name
                  }
                </Link>
                <span className="ml-2 text-destructive">
                  {t('contents.localization.taskTable.missingCount', { count: 13 })}
                </span>
              </TableCell>
              <TableCell>
                <Switch
                  id="border-switch"
                  checked={contentLocale.enabled}
                  className="data-[state=unchecked]:bg-input"
                  onCheckedChange={(checked: boolean) => {
                    handleOnCheckedChange(checked, contentLocale);
                  }}
                />
              </TableCell>
              <TableCell>{formatDate(new Date(contentLocale.updatedAt), 'PPpp')}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell className="h-24 text-center">
              {t('contents.localization.taskTable.noResults')}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

ContentLocalizationTable.displayName = 'ContentLocalizationTable';
