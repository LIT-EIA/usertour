import { useDeleteThemeMutation } from '@usertour-packages/shared-hooks';
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
import { Theme } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { LoadingButton } from '@/components/molecules/loading-button';
import { useTranslation } from 'react-i18next';

export const ThemeDeleteForm = (props: {
  data: Theme;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}) => {
  const { data, open, onOpenChange, onSubmit } = props;
  const { invoke: deleteTheme, loading } = useDeleteThemeMutation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDeleteSubmit = async () => {
    if (!data) {
      return;
    }
    try {
      const success = await deleteTheme(data.id);
      if (success) {
        toast({
          variant: 'success',
          title: t('settings.themes.deleteSuccess'),
        });
        onSubmit(true);
        return;
      }
    } catch (error) {
      onSubmit(false);
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  };

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('settings.common.deleteConfirm.title', { resource: t('settings.themes.deleteResource') })}</AlertDialogTitle>
          <AlertDialogDescription>{t('settings.themes.deleteDescription')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t('settings.common.cancel')}</AlertDialogCancel>
          <LoadingButton onClick={handleDeleteSubmit} loading={loading} variant="destructive">
            {t('settings.common.delete')}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

ThemeDeleteForm.displayName = 'ThemeDeleteForm';
