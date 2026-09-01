import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@usertour-packages/dialog';
import { useTranslation } from 'react-i18next';
import { ApiCopyButton } from './api-copy-button';

interface ApiKeyDialogProps {
  token: string;
  title?: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ApiKeyDialog = ({
  token,
  title,
  description,
  open,
  onOpenChange,
}: ApiKeyDialogProps) => {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t('settings.api.keyDialogDefaultTitle');
  const resolvedDescription = description ?? t('settings.api.keyDialogDescription');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{resolvedTitle}</DialogTitle>
          <DialogDescription>{resolvedDescription}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">{t('settings.api.keyLabel')}</span>
          <div className="flex items-center gap-2 p-4 bg-muted rounded-md">
            <code className="text-sm flex-1">{token}</code>
            <ApiCopyButton token={token} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
