'use client';

import { Icons } from '@/components/atoms/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-packages/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@usertour-packages/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@usertour-packages/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import { useChangeTeamMemberRoleMutation } from '@usertour-packages/shared-hooks';
import { getErrorMessage } from '@usertour/helpers';
import type { TeamMember } from '@usertour/types';
import { TeamMemberRole } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import * as React from 'react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

interface MemberChangeRoleDialogProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  data: TeamMember;
  projectId: string;
}

const formSchema = z.object({
  role: z.string({
    required_error: 'Please select your Member role.',
  }),
});

type FormValues = z.infer<typeof formSchema>;

export const MemberChangeRoleDialog = (props: MemberChangeRoleDialogProps) => {
  const { isOpen, onSuccess, onCancel, data, projectId } = props;
  const { invoke } = useChangeTeamMemberRoleMutation();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: data.role,
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [form, isOpen]);

  async function handleOnSubmit({ role }: FormValues) {
    setIsLoading(true);
    try {
      if (!data.userId) {
        showError(t('settings.team.changeRole.missingIds'));
        return;
      }
      const success = await invoke(projectId, data.userId, role);
      if (!success) {
        showError(t('settings.team.changeRole.failure'));
      }
      onSuccess();
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onCancel()}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>{t('settings.team.changeRole.title')}</DialogTitle>
            </DialogHeader>
            <div>
              <div className="space-y-4 py-2 pb-4 pt-4">
                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.team.changeRole.roleLabel')}</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormItem>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t('settings.team.changeRole.rolePlaceholder')}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value={TeamMemberRole.ADMIN}>
                                  {t('settings.team.roles.admin')}
                                </SelectItem>
                                <SelectItem value={TeamMemberRole.VIEWER}>
                                  {t('settings.team.roles.viewer')}
                                </SelectItem>
                              </SelectContent>
                            </FormItem>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onCancel}>
                {t('settings.common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {t('settings.team.changeRole.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

MemberChangeRoleDialog.displayName = 'MemberChangeRoleDialog';
