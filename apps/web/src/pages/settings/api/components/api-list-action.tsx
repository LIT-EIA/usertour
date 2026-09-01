import { useApiContext } from '@/contexts/api-context';
import {
  AccessToken,
  useDeleteAccessTokenMutation,
  useGetAccessTokenQuery,
} from '@usertour-packages/shared-hooks';
import { DotsHorizontalIcon, EyeOpenIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { Delete2Icon } from '@usertour-packages/icons';
import { useState } from 'react';
import { useAppContext } from '@/contexts/app-context';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-packages/alert-dialog';
import { useToast } from '@usertour-packages/use-toast';
import { ApiKeyDialog } from './api-key-dialog';
import { LoadingButton } from '@/components/molecules/loading-button';
import { useTranslation } from 'react-i18next';

// Type definitions
type ApiListActionProps = {
  token: AccessToken;
  environmentId: string;
};

type DeleteDialogProps = {
  token: AccessToken;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: () => Promise<void>;
  isLoading: boolean;
};

/**
 * Delete confirmation dialog component
 */
const DeleteDialog = ({ token, isOpen, onOpenChange, onDelete, isLoading }: DeleteDialogProps) => {
  const { t } = useTranslation();
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('settings.api.deleteResource')}{' '}
            <span className="font-bold text-foreground">{token.name}</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('settings.common.deleteConfirm.description', { name: token.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{t('settings.common.cancel')}</AlertDialogCancel>
          <LoadingButton
            variant="destructive"
            onClick={onDelete}
            loading={isLoading}
            className="min-w-[80px]"
          >
            {t('settings.common.delete')}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/**
 * Component for managing API token actions (currently only delete)
 */
export const ApiListAction = ({ token, environmentId }: ApiListActionProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRevealDialogOpen, setIsRevealDialogOpen] = useState(false);
  const [shouldFetchToken, setShouldFetchToken] = useState(false);
  const { refetch } = useApiContext();
  const { isViewOnly } = useAppContext();
  const { t } = useTranslation();
  const { invoke: deleteAccessToken, loading: isDeleting } = useDeleteAccessTokenMutation();
  const { data: fullToken, loading: isTokenLoading } = useGetAccessTokenQuery(
    environmentId,
    token.id,
    {
      skip: !shouldFetchToken,
    },
  );
  const { toast } = useToast();

  const handleReveal = () => {
    setIsRevealDialogOpen(true);
    setShouldFetchToken(true);
  };

  const handleDelete = async () => {
    try {
      const success = await deleteAccessToken(environmentId, token.id);
      if (success) {
        toast({
          variant: 'success',
          title: t('settings.api.deleteSuccess'),
        });
        setIsDeleteDialogOpen(false);
        refetch();
      } else {
        toast({
          variant: 'destructive',
          title: t('settings.api.deleteFailure'),
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: t('settings.api.deleteFailure'),
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
            <DotsHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuItem onClick={handleReveal}>
            <EyeOpenIcon className="w-4 h-4 mr-2" />
            {t('settings.api.revealMenuItem')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isViewOnly}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Delete2Icon className="w-4 h-4 mr-2" />
            {t('settings.api.deleteMenuItem')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteDialog
        token={token}
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onDelete={handleDelete}
        isLoading={isDeleting}
      />
      <ApiKeyDialog
        token={fullToken || ''}
        open={isRevealDialogOpen}
        onOpenChange={(open) => {
          setIsRevealDialogOpen(open);
          if (!open) {
            setShouldFetchToken(false);
          }
        }}
        description={isTokenLoading ? t('settings.api.keyDialogLoading') : undefined}
      />
    </>
  );
};

ApiListAction.displayName = 'ApiListAction';
