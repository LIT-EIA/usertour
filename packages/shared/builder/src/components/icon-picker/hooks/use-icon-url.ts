import { useCallback, useState, useEffect } from 'react';
import { useToast } from '@usertour-packages/use-toast';
import { LauncherIconSource } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { validateUrl } from '../utils';

interface UseIconUrlProps {
  iconUrl?: string;
  iconSource: LauncherIconSource;
  onUrlSubmit: (url: string) => void;
}

export const useIconUrl = ({ iconUrl, iconSource, onUrlSubmit }: UseIconUrlProps) => {
  const [urlInput, setUrlInput] = useState<string>('');
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (iconSource === LauncherIconSource.URL) {
      setUrlInput(iconUrl ?? '');
    } else {
      setUrlInput('');
    }
  }, [iconSource, iconUrl]);

  const handleUrlSubmit = useCallback(() => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) {
      toast({ variant: 'destructive', title: t('contentBuilder.iconPicker.invalidUrl') });
      return;
    }

    if (!validateUrl(trimmedUrl)) {
      toast({ variant: 'destructive', title: t('contentBuilder.iconPicker.invalidUrl') });
      return;
    }

    onUrlSubmit(trimmedUrl);
  }, [urlInput, onUrlSubmit, toast, t]);

  return {
    urlInput,
    setUrlInput,
    handleUrlSubmit,
    isValid: urlInput.trim().length > 0 && validateUrl(urlInput.trim()),
  };
};
