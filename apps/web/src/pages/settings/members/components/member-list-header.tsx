import { useMemberContext } from '@/contexts/member-context';
import { Button } from '@usertour-packages/button';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MemberInviteDialog } from './member-invite-dialog';
import { PlusIcon } from 'lucide-react';

export const MemberListHeader = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { refetch } = useMemberContext();
  const { t } = useTranslation();

  const handleCreate = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const handleOnClose = useCallback(() => {
    setIsDialogOpen(false);
    refetch();
  }, [refetch]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold tracking-tight">{t('settings.team.title')}</h3>
        <Button onClick={handleCreate} className="flex-none">
          <PlusIcon className="w-4 h-4" />
          {t('settings.team.newButton')}
        </Button>
      </div>
      <MemberInviteDialog isOpen={isDialogOpen} onClose={handleOnClose} />
    </div>
  );
};

MemberListHeader.displayName = 'MemberListHeader';
