import { useCallback, useState } from 'react';
import { useToast } from '@usertour-packages/use-toast';
import { useAws } from '../../../hooks/use-aws';
import type { RcUploadOption } from '../types';

interface UseIconUploadProps {
  onUploadSuccess: (url: string) => void;
}

export const useIconUpload = ({ onUploadSuccess }: UseIconUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { upload } = useAws();

  const handleUpload = useCallback(
    (option: RcUploadOption) => {
      setIsUploading(true);

      const file = option.file;
      if (!(file instanceof File)) {
        const error = new Error('Invalid file type');
        toast({ variant: 'destructive', title: 'Please select a valid file' });
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
              reader.onerror = () => reject(new Error('Failed to read file'));
              reader.readAsDataURL(file);
            });
          }

          if (url) {
            option.onSuccess?.({ url });
            onUploadSuccess(url);
          } else {
            const error = new Error('Upload failed');
            toast({ variant: 'destructive', title: 'Failed to upload icon' });
            option.onError?.(error);
          }
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Upload failed');
          toast({ variant: 'destructive', title: error.message });
          option.onError?.(error);
        } finally {
          setIsUploading(false);
        }
      };

      processUpload();
    },
    [onUploadSuccess, upload, toast],
  );

  return { handleUpload, isUploading };
};
