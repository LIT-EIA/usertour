'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-packages/button';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@usertour-packages/form';

import { Icons } from '@/components/atoms/icons';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@usertour-packages/card';
import { Input } from '@usertour-packages/input';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useResetUserPasswordByCodeMutation } from '@usertour-packages/shared-hooks';
import { useTranslation } from 'react-i18next';

const formSchema = z.object({
  password: z
    .string({
      required_error: 'Please input your password.',
    })
    .max(20)
    .min(8),
  repassword: z
    .string({
      required_error: 'Please input your password again.',
    })
    .max(20)
    .min(8),
});

type FormValues = z.infer<typeof formSchema>;

const defaultValues: Partial<FormValues> = {
  password: '',
  repassword: '',
};

export const PasswordReset = () => {
  const { invoke: resetPassword } = useResetUserPasswordByCodeMutation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const { code } = useParams();
  const { t } = useTranslation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: 'onChange',
  });

  async function onSubmit(formData: FormValues) {
    const { password, repassword } = formData;
    if (password !== repassword) {
      return toast({
        variant: 'destructive',
        title: t('auth.errors.passwordsDoNotMatch'),
      });
    }
    if (!code) {
      return toast({
        variant: 'destructive',
        title: t('auth.errors.resetCodeMissing'),
      });
    }
    try {
      setIsLoading(true);
      const result = await resetPassword(code, password);
      setIsLoading(false);
      if (result?.success) {
        return navigate('/auth/signin');
      }
      toast({
        variant: 'destructive',
        title: t('auth.errors.genericFailure'),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl  font-semibold tracking-tight">
              {t('auth.passwordReset.title')}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {t('auth.passwordReset.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.passwordReset.newPasswordLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('auth.passwordReset.newPasswordPlaceholder')}
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-2">
              <FormField
                control={form.control}
                name="repassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.passwordReset.repeatPasswordLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('auth.passwordReset.repeatPasswordPlaceholder')}
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              {t('auth.passwordReset.submitButton')}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
};

PasswordReset.displayName = 'PasswordReset';
