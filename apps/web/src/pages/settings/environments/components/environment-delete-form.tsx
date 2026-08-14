import { Environment } from '@usertour/types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-packages/alert-dialog';
import { getErrorMessage } from '@usertour/helpers';
import { useDeleteEnvironmentsMutation } from '@usertour-packages/shared-hooks';
import { useToast } from '@usertour-packages/use-toast';
import { LoadingButton } from '@/components/molecules/loading-button';
import { useTranslation } from 'react-i18next';

export const EnvironmentDeleteForm = (props: {
  data: Environment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}) => {
  const { data, open, onOpenChange, onSubmit } = props;
  const { invoke: deleteEnvironment, loading } = useDeleteEnvironmentsMutation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDeleteSubmit = async () => {
    if (!data?.id) {
      toast({
        variant: 'destructive',
        title: t('settings.environments.invalidData'),
      });
      return;
    }

    try {
      const success = await deleteEnvironment(data.id);
      if (success) {
        toast({
          variant: 'success',
          title: t('settings.environments.deleteSuccess'),
        });
        onSubmit(true);
      } else {
        toast({
          variant: 'destructive',
          title: t('settings.environments.deleteFailure'),
        });
        onSubmit(false);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
      onSubmit(false);
    }
  };

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('settings.common.deleteConfirm.title', { resource: t('settings.environments.deleteResource') })}</AlertDialogTitle>
          <AlertDialogDescription dangerouslySetInnerHTML={{ __html: t('settings.common.deleteConfirm.description', { name: data.name }) }} />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('settings.common.cancel')}</AlertDialogCancel>
          <LoadingButton onClick={handleDeleteSubmit} variant="destructive" loading={loading}>
            {t('settings.common.deleteConfirm.confirm', { resource: t('settings.environments.deleteResource') })}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

EnvironmentDeleteForm.displayName = 'EnvironmentDeleteForm';
