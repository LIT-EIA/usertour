import { useMutation } from '@apollo/client';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-packages/alert-dialog';
import { deleteBizCompanyOnSegment } from '@usertour-packages/gql';
import { getErrorMessage } from '@usertour/helpers';
import { Segment } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback } from 'react';
import { LoadingButton } from '@/components/molecules/loading-button';
import { useTranslation } from 'react-i18next';

interface BizCompanyRemoveFormProps {
  bizCompanyIds: string[];
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => Promise<void>;
}

export const BizCompanyRemoveForm = (props: BizCompanyRemoveFormProps) => {
  const { bizCompanyIds, open, onOpenChange, onSubmit, segment } = props;
  const [mutation, { loading }] = useMutation(deleteBizCompanyOnSegment);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSubmit = useCallback(async () => {
    if (bizCompanyIds.length === 0) {
      return;
    }
    const data = {
      bizCompanyIds,
      segmentId: segment.id,
    };
    try {
      const ret = await mutation({ variables: { data } });
      if (ret.data?.deleteBizCompanyOnSegment?.success) {
        toast({
          variant: 'success',
          title: t('companies.toast.segments.companiesRemoved', {
            count: ret.data?.deleteBizCompanyOnSegment.count,
          }),
        });
        await onSubmit(true);
      }
    } catch (error) {
      onSubmit(false);
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  }, [bizCompanyIds, segment, mutation, toast, onSubmit]);

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('companies.dialogs.deleteSegment.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            Confirm removing the selected users from {segment.name}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('companies.actions.cancel')}</AlertDialogCancel>
          <LoadingButton onClick={handleSubmit} loading={loading}>
            Yes, remove {bizCompanyIds.length} users
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

BizCompanyRemoveForm.displayName = 'BizCompanyRemoveForm';
