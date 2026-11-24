'use client';

import { Icons } from '@/components/atoms/icons';
import { useAppContext } from '@/contexts/app-context';
import {
  PersonNameFields,
  createPersonNameSchema,
} from '@/components/molecules/person-name-fields';
import type { PersonNameFormValues } from '@/components/molecules/person-name-fields';
import { useMutation } from '@apollo/client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-packages/button';
import { Form } from '@usertour-packages/form';
import { updateUser } from '@usertour-packages/gql';
import { Separator } from '@usertour-packages/separator';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

type AccountFormValues = PersonNameFormValues;

export const AccountProfileForm = () => {
  const { userInfo: user, refetch } = useAppContext();
  const [updateMutation] = useMutation(updateUser);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const { t } = useTranslation();
  const formSchema = useMemo(() => createPersonNameSchema(t), [t]);
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' },
  });
  const isUnchanged =
    form.watch('firstName') === (user?.firstName ?? '') &&
    form.watch('lastName') === (user?.lastName ?? '');

  const onSubmit = async (data: AccountFormValues) => {
    try {
      setIsLoading(true);
      await updateMutation({
        variables: {
          firstName: data.firstName,
          lastName: data.lastName ?? '',
          avatarUrl: '',
        },
      });
      await refetch();
      setIsLoading(false);
      toast({
        variant: 'success',
        title: t('settings.account.profile.successToast'),
      });
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
      <div className="flex flex-row justify-between items-center h-10">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t('settings.account.profile.title')}
        </h2>
        {/* <p className="text-sm text-muted-foreground">
          Update your profile name.
        </p> */}
      </div>
      <Separator />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <PersonNameFields
            control={form.control}
            firstNamePlaceholder={t('settings.account.profile.firstNamePlaceholder')}
            lastNamePlaceholder={t('settings.account.profile.lastNamePlaceholder')}
            isOwnName
          />

          <Button type="submit" disabled={isUnchanged || isLoading}>
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            {t('settings.common.save')}
          </Button>
        </form>
      </Form>
    </div>
  );
};

AccountProfileForm.displayName = 'AccountProfileForm';
