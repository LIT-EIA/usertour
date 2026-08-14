import { useDeleteSegmentMutation } from '@usertour-packages/shared-hooks';
import { useTranslation } from 'react-i18next';
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
import { Segment } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { LoadingButton } from '@/components/molecules/loading-button';

export const UserSegmentDeleteForm = (props: {
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}) => {
  const { segment, open, onOpenChange, onSubmit } = props;
  const { invoke: deleteSegment, loading } = useDeleteSegmentMutation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDeleteSubmit = async () => {
    if (!segment) {
      return;
    }
    try {
      const success = await deleteSegment(segment.id);
      if (success) {
        toast({
          variant: 'success',
          title: t('users.toast.segments.segmentDeleted', { segmentName: segment.name }),
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
          <AlertDialogTitle>{t('users.dialogs.deleteSegment.title')}</AlertDialogTitle>
          <AlertDialogDescription>Confirm deleting {segment.name}?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{t('users.actions.cancel')}</AlertDialogCancel>
          <LoadingButton onClick={handleDeleteSubmit} loading={loading} variant="destructive">
            {t('users.dialogs.deleteSegment.confirmButton')}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

UserSegmentDeleteForm.displayName = 'UserSegmentDeleteForm';
