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
import { useDeleteSegmentMutation } from '@usertour-packages/shared-hooks';
import { useTranslation } from 'react-i18next';

interface CompanySegmentDeleteFormProps {
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const CompanySegmentDeleteForm = ({
  segment,
  open,
  onOpenChange,
  onSubmit,
}: CompanySegmentDeleteFormProps) => {
  const { invoke: deleteSegment, loading } = useDeleteSegmentMutation();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDeleteSubmit = async () => {
    if (!segment?.id) {
      toast({
        variant: 'destructive',
        title: t('companies.dialogs.deleteSegment.invalidData'),
      });
      return;
    }

    try {
      const success = await deleteSegment(segment.id);

      if (success) {
        toast({
          variant: 'success',
          title: t('companies.dialogs.deleteSegment.deleteSuccess', { segmentName: segment.name }),
        });
        onSubmit(true);
        onOpenChange(false);
      } else {
        toast({
          variant: 'destructive',
          title: t('companies.dialogs.deleteSegment.deleteFailure'),
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
          <AlertDialogTitle>{t('companies.dialogs.deleteSegment.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            <span
              dangerouslySetInnerHTML={{
                __html: t('companies.dialogs.deleteSegment.description', {
                  segmentName: segment.name,
                }),
              }}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('companies.actions.cancel')}</AlertDialogCancel>
          <LoadingButton onClick={handleDeleteSubmit} variant="destructive" loading={loading}>
            {t('companies.dialogs.deleteSegment.confirmButton')}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

CompanySegmentDeleteForm.displayName = 'CompanySegmentDeleteForm';
