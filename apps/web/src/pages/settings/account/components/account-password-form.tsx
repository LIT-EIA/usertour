'use client';

import { Icons } from '@/components/atoms/icons';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-packages/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@usertour-packages/form';
import { changePassword } from '@usertour-packages/gql';
import { Input } from '@usertour-packages/input';
import { Separator } from '@usertour-packages/separator';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';

const accountFormSchema = z
  .object({
    currentPassword: z
      .string()
      .min(2, {
        message: 'Password must be at least 6 characters.',
      })
      .max(30, {
        message: 'Password must not be longer than 30 characters.',
      }),
    newPassword: z
      .string()
      .min(2, {
        message: 'Password must be at least 6 characters.',
      })
      .max(30, {
        message: 'Password must not be longer than 30 characters.',
      }),
    confirmPassword: z
      .string()
      .min(2, {
        message: 'Password must be at least 6 characters.',
      })
      .max(30, {
        message: 'Password must not be longer than 30 characters.',
      }),
  })
  .superRefine(({ confirmPassword, newPassword }, ctx) => {
    if (confirmPassword !== newPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'The passwords did not match',
      });
    }
  });
type AccountFormValues = z.infer<typeof accountFormSchema>;

export const AccountPasswordForm = () => {
  const [updateMutation] = useMutation(changePassword);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });
  const { toast } = useToast();
  const { t } = useTranslation();

  const onSubmit = async (data: AccountFormValues) => {
    if (!data.newPassword) {
      return;
    }
    try {
      setIsLoading(true);
      const ret = await updateMutation({
        variables: {
          newPassword: data.newPassword,
          oldPassword: data.currentPassword,
        },
      });
      if (ret.data?.changePassword?.id) {
        toast({
          variant: 'success',
          title: t('settings.account.password.successToast'),
        });
      }
      setIsLoading(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight">{t('settings.account.password.title')}</h3>
        {/* <p className="text-sm text-muted-foreground">Update your password.</p> */}
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settings.account.password.currentLabel')}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder={t('settings.account.password.currentPlaceholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settings.account.password.newLabel')}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    placeholder={t('settings.account.password.newPlaceholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('settings.account.password.confirmLabel')}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="confirm-password"
                    placeholder={t('settings.account.password.confirmPlaceholder')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={form.watch('newPassword') === form.watch('currentPassword')}
          >
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            {t('settings.common.save')}
          </Button>
        </form>
      </Form>
    </div>
  );
};

AccountPasswordForm.displayName = 'AccountPasswordForm';
