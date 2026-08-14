import { Attribute } from '@usertour/types';
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
import { useToast } from '@usertour-packages/use-toast';
import { useDeleteAttributeMutation } from '@usertour-packages/shared-hooks';
import { LoadingButton } from '@/components/molecules/loading-button';
import { useTranslation } from 'react-i18next';

export const AttributeDeleteForm = (props: {
  data: Attribute;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}) => {
  const { data, open, onOpenChange, onSubmit } = props;
  const { invoke: deleteAttribute, loading: isDeleting } = useDeleteAttributeMutation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDeleteSubmit = async () => {
    if (!data) {
      return;
    }

    try {
      const success = await deleteAttribute(data.id);
      if (success) {
        toast({
          variant: 'success',
          title: t('settings.attributes.deleteSuccess'),
        });
        onSubmit(true);
        onOpenChange(false);
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
          <AlertDialogTitle>{t('settings.common.deleteConfirm.title', { resource: t('settings.attributes.deleteResource') })}</AlertDialogTitle>
          <AlertDialogDescription dangerouslySetInnerHTML={{ __html: t('settings.common.deleteConfirm.description', { name: data.displayName }) }} />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('settings.common.cancel')}</AlertDialogCancel>
          <LoadingButton onClick={handleDeleteSubmit} variant="destructive" loading={isDeleting}>
            {t('settings.common.deleteConfirm.confirm', { resource: t('settings.attributes.deleteResource') })}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

AttributeDeleteForm.displayName = 'AttributeDeleteForm';
