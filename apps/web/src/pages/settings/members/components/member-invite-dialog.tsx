'use client';

import { Icons } from '@/components/atoms/icons';
import { useAppContext } from '@/contexts/app-context';
import { useMemberContext } from '@/contexts/member-context';
import {
  PersonNameFields,
  createPersonNameSchema,
} from '@/components/molecules/person-name-fields';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription, AlertTitle } from '@usertour-packages/alert';
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
import { Input } from '@usertour-packages/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import {
  useGetSubscriptionByProjectIdQuery,
  useInviteTeamMemberMutation,
} from '@usertour-packages/shared-hooks';
import { getErrorMessage } from '@usertour/helpers';
import { PlanType, Subscription, TeamMemberRole } from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { AlertCircle } from 'lucide-react';
import * as React from 'react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import type { TFunction } from 'i18next';

interface InviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const createFormSchema = (t: TFunction) =>
  createPersonNameSchema(t).extend({
    email: z
      .string({
        required_error: 'Please input your Member email.',
      })
      .email(),
    role: z.string({
      required_error: 'Please select your Member role.',
    }),
  });

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

const defaultValues: Partial<FormValues> = {
  firstName: '',
  lastName: '',
  email: '',
  role: TeamMemberRole.ADMIN,
};

export const MemberInviteDialog = ({ onClose, isOpen }: InviteDialogProps) => {
  const { invoke } = useInviteTeamMemberMutation();
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const { project } = useAppContext();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { members = [] } = useMemberContext();
  const { globalConfig } = useAppContext();
  const navigate = useNavigate();
  const formSchema = useMemo(() => createFormSchema(t), [t]);

  const { subscription } = useGetSubscriptionByProjectIdQuery(project?.id as string) as {
    subscription: Subscription | null;
  };

  const planType: PlanType = subscription?.planType ?? PlanType.HOBBY;

  const canInviteMembers = useMemo(() => {
    if (globalConfig?.isSelfHostedMode) {
      return true;
    }
    return (
      (planType === PlanType.STARTER && members.length < 3) ||
      (planType === PlanType.GROWTH && members.length < 10) ||
      planType === PlanType.BUSINESS
    );
  }, [planType, members.length, globalConfig?.isSelfHostedMode]);

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    if (isOpen) {
      form.reset();
    }
  }, [form, isOpen]);

  async function handleOnSubmit(formValues: FormValues) {
    setIsLoading(true);
    try {
      const success = await invoke(
        project?.id as string,
        { firstName: formValues.firstName, lastName: formValues.lastName },
        formValues.email,
        formValues.role,
      );
      if (!success) {
        showError(t('settings.team.invite.failure'));
      }
      onClose();
    } catch (error) {
      showError(getErrorMessage(error));
    }
    setIsLoading(false);
  }

  if (!canInviteMembers) {
    return (
      <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('settings.team.invite.title')}</DialogTitle>
          </DialogHeader>
          <Alert className="bg-primary/10 border-primary/5">
            <AlertCircle className="h-4 w-4 !text-primary" />
            <AlertTitle>{t('settings.team.invite.limitTitle')}</AlertTitle>
            <AlertDescription>
              {t('settings.team.invite.limitDescriptionPrefix')}
              <Button
                variant="link"
                className="p-0 h-auto font-normal inline"
                onClick={() => {
                  onClose();
                  navigate(`/project/${project?.id}/settings/billing`);
                }}
              >
                {t('settings.team.invite.upgradeInline')}
              </Button>
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/project/${project?.id}/settings/billing`);
              }}
            >
              {t('settings.team.invite.upgradeButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(op) => !op && onClose()}>
      <DialogContent className="max-w-xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleOnSubmit)}>
            <DialogHeader>
              <DialogTitle>{t('settings.team.invite.title')}</DialogTitle>
            </DialogHeader>
            <div>
              <div className="space-y-4 py-2 pb-4 pt-4">
                <div className="space-y-2">
                  <PersonNameFields
                    control={form.control}
                    firstNamePlaceholder={t('settings.team.invite.firstNamePlaceholder')}
                    lastNamePlaceholder={t('settings.team.invite.lastNamePlaceholder')}
                    isOwnName={false}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.team.invite.emailLabel')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('settings.team.invite.emailPlaceholder')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('settings.team.invite.roleLabel')}</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue
                                placeholder={t('settings.team.invite.rolePlaceholder')}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={TeamMemberRole.ADMIN}>
                                {t('settings.team.roles.admin')}
                              </SelectItem>
                              <SelectItem value={TeamMemberRole.VIEWER}>
                                {t('settings.team.roles.viewer')}
                              </SelectItem>
                            </SelectContent>
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
              <Button variant="outline" type="button" onClick={() => onClose()}>
                {t('settings.common.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                {t('settings.team.invite.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

MemberInviteDialog.displayName = 'MemberInviteDialog';
