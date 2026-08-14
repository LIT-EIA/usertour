import { Event } from '@usertour/types';
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
import { useDeleteEventMutation } from '@usertour-packages/shared-hooks';
import { useToast } from '@usertour-packages/use-toast';
import { LoadingButton } from '@/components/molecules/loading-button';
import { useTranslation } from 'react-i18next';

export const EventDeleteForm = (props: {
  data: Event;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}) => {
  const { data, open, onOpenChange, onSubmit } = props;
  const { invoke: deleteEvent, loading } = useDeleteEventMutation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDeleteSubmit = async () => {
    if (!data?.id) {
      toast({
        variant: 'destructive',
        title: t('settings.events.invalidData'),
      });
      return;
    }
    try {
      const success = await deleteEvent(data.id);
      if (success) {
        toast({
          variant: 'success',
          title: t('settings.events.deleteSuccess'),
        });
        onSubmit(true);
        onOpenChange(false);
        return;
      }
      toast({
        variant: 'destructive',
        title: t('settings.events.deleteFailure'),
      });
      onSubmit(false);
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
          <AlertDialogTitle>{t('settings.common.deleteConfirm.title', { resource: t('settings.events.deleteResource') })}</AlertDialogTitle>
          <AlertDialogDescription dangerouslySetInnerHTML={{ __html: t('settings.common.deleteConfirm.description', { name: data.displayName }) }} />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('settings.common.cancel')}</AlertDialogCancel>
          <LoadingButton onClick={handleDeleteSubmit} loading={loading} variant="destructive">
            {t('settings.common.deleteConfirm.confirm', { resource: t('settings.events.deleteResource') })}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

EventDeleteForm.displayName = 'EventDeleteForm';
