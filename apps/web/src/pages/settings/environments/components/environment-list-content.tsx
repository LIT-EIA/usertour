import { ListSkeleton } from '@/components/molecules/skeleton';
import { useEnvironmentListContext } from '@/contexts/environment-list-context';
import { Environment } from '@usertour/types';
import { CopyIcon, QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@usertour-packages/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { cn } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { formatDate as format } from '@/utils/common';
import { useCallback, useState } from 'react';
import { useCopyToClipboard } from 'react-use';
import { useTranslation } from 'react-i18next';
import { EnvironmentListAction } from './environment-list-action';

interface EnvironmentListContentTableRowProps {
  environment: Environment;
}
const EnvironmentListContentTableRow = (props: EnvironmentListContentTableRowProps) => {
  const { environment } = props;
  const [_, copyToClipboard] = useCopyToClipboard();
  const [isShowCopy, setIsShowCopy] = useState<boolean>(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleCopy = useCallback(() => {
    copyToClipboard(environment.token);
    toast({
      title: t('settings.environments.tokenCopiedToast', { token: environment.token }),
    });
  }, [environment.token, t]);

  return (
    <TableRow className="cursor-pointer">
      <TableCell>{environment.name}</TableCell>
      <TableCell onMouseEnter={() => setIsShowCopy(true)} onMouseLeave={() => setIsShowCopy(false)}>
        <div className="flex flex-row items-center space-x-1">
          <span>{environment.token} </span>
          <Button
            variant={'ghost'}
            size={'icon'}
            className={cn('w-6 h-6 rounded', isShowCopy ? 'visible' : 'invisible')}
            onClick={handleCopy}
          >
            <CopyIcon className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
      <TableCell>{format(new Date(environment.createdAt), 'PPpp')}</TableCell>
      <TableCell>
        <EnvironmentListAction environment={environment} />
      </TableCell>
    </TableRow>
  );
};

export const EnvironmentListContent = () => {
  const { environmentList, loading, isRefetching } = useEnvironmentListContext();
  const { t } = useTranslation();

  if (loading || isRefetching) {
    return <ListSkeleton />;
  }
  return (
    <>
      <div className="rounded-md border-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('settings.environments.columns.name')}</TableHead>
              <TableHead>
                {t('settings.environments.columns.token')}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <QuestionMarkCircledIcon className="inline ml-1 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs bg-foreground text-background">
                      {t('settings.environments.tokenTooltip')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableHead>
              <TableHead>{t('settings.environments.columns.createdAt')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {environmentList ? (
              environmentList?.map((environment: Environment) => (
                <EnvironmentListContentTableRow environment={environment} key={environment.id} />
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

EnvironmentListContent.displayName = 'EnvironmentListContent';
