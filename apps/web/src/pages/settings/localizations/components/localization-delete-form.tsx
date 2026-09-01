import { useMutation } from '@apollo/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@usertour-packages/alert-dialog';
import { deleteLocalization } from '@usertour-packages/gql';
import { getErrorMessage } from '@usertour/helpers';
import { Localization } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { useTranslation } from 'react-i18next';

export const LocalizationDeleteForm = (props: {
  data: Localization;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (success: boolean) => void;
}) => {
  const { data, open, onOpenChange, onSubmit } = props;
  const [deleteMutation] = useMutation(deleteLocalization);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDeleteSubmit = async () => {
    if (!data) {
      return;
    }
    try {
      const ret = await deleteMutation({
        variables: {
          id: data.id,
        },
      });
      if (ret.data?.deleteLocalization?.id) {
        toast({
          variant: 'success',
          title: t('settings.localizations.deleteSuccess'),
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
          <AlertDialogTitle>
            {t('settings.common.deleteConfirm.title', {
              resource: t('settings.localizations.deleteResource'),
            })}
          </AlertDialogTitle>
          <AlertDialogDescription
            // biome-ignore lint/security/noDangerouslySetInnerHtml: translated string; i18next escapes interpolated values by default
            dangerouslySetInnerHTML={{
              __html: t('settings.common.deleteConfirm.description', { name: data.name }),
            }}
          />
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('settings.common.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteSubmit}>
            {t('settings.common.deleteConfirm.confirm', {
              resource: t('settings.localizations.deleteResource'),
            })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

LocalizationDeleteForm.displayName = 'LocalizationDeleteForm';
