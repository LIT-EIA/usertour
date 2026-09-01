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
import { getContentTypeGenderContext } from '@/utils/content-type';
import { useDeleteContentMutation } from '@usertour-packages/shared-hooks';
import { Content, ContentDataType } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { LoadingButton } from '@/components/molecules/loading-button';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface ContentDeleteFormProps {
  content: Content;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}

export const ContentDeleteForm = ({
  content,
  open,
  onOpenChange,
  onSubmit,
}: ContentDeleteFormProps) => {
  const { invoke: deleteContent, loading } = useDeleteContentMutation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const contentType = content.type || ContentDataType.FLOW;
  const contentName = content.name;
  const typeContext = getContentTypeGenderContext(contentType);
  const translatedType = t(`contents.types.${contentType}`);

  const handleDeleteSubmit = useCallback(async () => {
    if (!content?.id) {
      toast({
        variant: 'destructive',
        title: t('contents.deleteDialog.invalidData'),
      });
      return;
    }

    try {
      const success = await deleteContent(content.id);

      if (success) {
        toast({
          variant: 'success',
          title: t('contents.deleteDialog.deleteSuccess', {
            contentType: translatedType,
            name: contentName,
            context: typeContext,
          }),
        });
        onSubmit(true);
        onOpenChange(false);
      } else {
        toast({
          variant: 'destructive',
          title: t('contents.deleteDialog.deleteFailure'),
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
  }, [content?.id, contentType, deleteContent, toast, onSubmit, onOpenChange]);

  return (
    <AlertDialog defaultOpen={open} open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('contents.deleteDialog.title', { contentType: translatedType })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <span
              // biome-ignore lint/security/noDangerouslySetInnerHtml: translated string; i18next escapes interpolated values by default
              dangerouslySetInnerHTML={{
                __html: t('contents.deleteDialog.description', { name: contentName }),
              }}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('contents.deleteDialog.cancelButton')}</AlertDialogCancel>
          <LoadingButton variant="destructive" onClick={handleDeleteSubmit} loading={loading}>
            {t('contents.deleteDialog.confirmButton', { contentType: translatedType })}
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

ContentDeleteForm.displayName = 'ContentDeleteForm';
