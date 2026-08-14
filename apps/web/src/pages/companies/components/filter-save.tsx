import { useAppContext } from '@/contexts/app-context';
import { useSegmentListContext } from '@/contexts/segment-list-context';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-packages/alert-dialog';
import { Button } from '@usertour-packages/button';
import { conditionsIsSame, getErrorMessage } from '@usertour/helpers';
import { useUpdateSegmentMutation } from '@usertour-packages/shared-hooks';
import { Segment } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { useCallback, useEffect, useState } from 'react';
import { LoadingButton } from '@/components/molecules/loading-button';
import { useTranslation } from 'react-i18next';

export const UserSegmentFilterSave = (props: { currentSegment?: Segment }) => {
  const { currentSegment } = props;
  const { invoke: updateSegment, loading } = useUpdateSegmentMutation();
  const { refetch, currentConditions, isRefetching } = useSegmentListContext();
  const { toast } = useToast();
  const { isViewOnly } = useAppContext();
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [isShowButton, setIsShowButton] = useState(false);

  const handleOnClick = () => {
    setOpen(true);
  };

  const handleSubmit = useCallback(async () => {
    if (
      !currentSegment ||
      !currentConditions ||
      currentConditions.segmentId !== currentSegment.id
    ) {
      return;
    }
    const data = {
      id: currentSegment.id,
      data: currentConditions.data,
      name: currentSegment.name,
    };
    try {
      const success = await updateSegment(data);
      if (success) {
        await refetch();
        toast({
          variant: 'success',
          title: `The segment ${currentSegment.name} filter has been successfully saved`,
        });
        setOpen(false);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
    }
  }, [currentSegment, currentConditions, updateSegment, toast, setOpen]);

  useEffect(() => {
    if (
      currentSegment?.data &&
      currentConditions &&
      !conditionsIsSame(currentSegment.data, currentConditions.data) &&
      currentSegment.dataType === 'CONDITION'
    ) {
      setIsShowButton(true);
    } else {
      setIsShowButton(false);
    }
  }, [currentSegment, currentConditions]);

  return (
    <>
      {isShowButton && (
        <Button
          className="h-8 ml-3 text-primary hover:text-primary"
          variant={'ghost'}
          onClick={handleOnClick}
          disabled={isViewOnly}
        >
          {t('companies.filters.saveFilter')}
        </Button>
      )}
      <AlertDialog defaultOpen={open} open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('companies.filters.saveFilter')}</AlertDialogTitle>
            <AlertDialogDescription>
              Confirm saving <span className="font-bold">{currentSegment?.name}</span> filter?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('companies.actions.cancel')}</AlertDialogCancel>
            <LoadingButton onClick={handleSubmit} loading={loading || isRefetching}>
              {t('companies.filters.yesSave')}
            </LoadingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

UserSegmentFilterSave.displayName = 'UserSegmentFilterSave';
