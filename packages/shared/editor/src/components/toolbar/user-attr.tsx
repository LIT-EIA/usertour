import { Button } from '@usertour-packages/button';
import { useTranslation } from 'react-i18next';
import { UserIcon } from '@usertour-packages/icons';
import { cn } from '@usertour/helpers';
import { useSlate } from 'slate-react';
import { inertUserAttributeBlock } from '../../lib/editorHelper';

export const UserAttrButton = ({ className }: { className: string }) => {
  const { t } = useTranslation();
  const editor = useSlate();
  const handleOnClick = () => {
    inertUserAttributeBlock(editor);
  };
  return (
    <Button
      variant="ghost"
      onClick={handleOnClick}
      className={cn('h-fit p-2', className)}
      aria-label={t('contentBuilder.editor.toolbar.userAttribute.ariaLabel')}
    >
      <UserIcon height={15} width={15} aria-hidden="true" />
    </Button>
  );
};
