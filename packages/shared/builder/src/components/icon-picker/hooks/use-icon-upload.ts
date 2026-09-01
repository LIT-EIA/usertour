import { useCallback, useState } from 'react';
import { useToast } from '@usertour-packages/use-toast';
import { useTranslation } from 'react-i18next';
import { useAws } from '../../../hooks/use-aws';
import type { RcUploadOption } from '../types';

interface UseIconUploadProps {
  onUploadSuccess: (url: string) => void;
}

export const useIconUpload = ({ onUploadSuccess }: UseIconUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { upload } = useAws();
  const { t } = useTranslation();

  const handleUpload = useCallback(
    (option: RcUploadOption) => {
      setIsUploading(true);

      const file = option.file;
      if (!(file instanceof File)) {
        const error = new Error(t('contentBuilder.iconPicker.invalidFileType'));
        toast({ variant: 'destructive', title: t('contentBuilder.iconPicker.invalidFile') });
        option.onError?.(error);
        setIsUploading(false);
        return;
      }

      const processUpload = async () => {
        try {
          let url = '';

          try {
            url = await upload(file);
          } catch {
            url = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () =>
                reject(new Error(t('contentBuilder.iconPicker.failedToReadFile')));
              reader.readAsDataURL(file);
            });
          }

          if (url) {
            option.onSuccess?.({ url });
            onUploadSuccess(url);
          } else {
            const error = new Error(t('contentBuilder.iconPicker.uploadFailed'));
            toast({ variant: 'destructive', title: t('contentBuilder.iconPicker.uploadFailed') });
            option.onError?.(error);
          }
        } catch (err) {
          const error =
            err instanceof Error ? err : new Error(t('contentBuilder.iconPicker.uploadFailed'));
          toast({ variant: 'destructive', title: error.message });
          option.onError?.(error);
        } finally {
          setIsUploading(false);
        }
      };

      processUpload();
    },
    [onUploadSuccess, upload, toast, t],
  );

  return { handleUpload, isUploading };
};
