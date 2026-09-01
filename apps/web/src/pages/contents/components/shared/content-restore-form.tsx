'use client';
import { Icons } from '@/components/atoms/icons';
import { useMutation } from '@apollo/client';
import { Button } from '@usertour-packages/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-packages/dialog';
import { restoreContentVersion } from '@usertour-packages/gql';
import { getErrorMessage } from '@usertour/helpers';
import { ContentVersion } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

interface ContentRestoreFormProps {
  version: ContentVersion;
  onSubmit: (success: boolean) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ContentRestoreForm = (props: ContentRestoreFormProps) => {
  const { version, onSubmit, open, onOpenChange } = props;
  const [mutation] = useMutation(restoreContentVersion);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  async function handleOnSubmit() {
    try {
      setIsLoading(true);
      const { data } = await mutation({
        variables: { versionId: version.id },
      });
      setIsLoading(false);
      if (data.restoreContentVersion.id) {
        toast({
          variant: 'success',
          title: t('contents.shared.restore.successToast'),
        });
        onSubmit(true);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
      onSubmit(false);
      setIsLoading(false);
    }
  }

  return (
    <Dialog defaultOpen={true} open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('contents.shared.restore.title')}</DialogTitle>
        </DialogHeader>
        <div>
          <p>{t('contents.shared.restore.descriptionLoad', { version: version.sequence })}</p>
          <p>{t('contents.shared.restore.descriptionConfirm', { version: version.sequence })}</p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" type="button">
              {t('contents.shared.common.cancel')}
            </Button>
          </DialogClose>
          <Button className="flex-none" type="submit" disabled={isLoading} onClick={handleOnSubmit}>
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            {t('contents.shared.restore.confirmButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
