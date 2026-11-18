'use client';

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-packages/button';
import { getErrorMessage } from '@usertour/helpers';
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
import { SpinnerIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { useToast } from '@usertour-packages/use-toast';
import { Link } from 'react-router-dom';
import {
  LoginMutationVariables,
  useGetAuthConfigQuery,
  useLoginMutation,
} from '@usertour-packages/shared-hooks';
import { useTranslation } from 'react-i18next';

// Form validation schema
const signinFormSchema = z.object({
  email: z
    .string({
      required_error: 'Please select an email to display.',
    })
    .email(),
  password: z.string().max(160).min(4),
});

type SigninFormValues = z.infer<typeof signinFormSchema>;

const defaultValues: Partial<SigninFormValues> = {
  email: '',
  password: '',
};

// Third-party (OAuth) sign-in has been removed server-side; email/password is the only provider.
type AuthProvider = 'email';
type AuthConfigItem = {
  provider: AuthProvider;
};

// Context type definition
type SignInContextType = {
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
  isEmailAuthEnabled: boolean;
  toast: ReturnType<typeof useToast>['toast'];
  showError: (title: string) => void;
  form: ReturnType<typeof useForm<SigninFormValues>>;
  onSubmit: (data: SigninFormValues) => Promise<void>;
};

// Create context
const SignInContext = React.createContext<SignInContextType | undefined>(undefined);

// Custom hook for using SignIn context
const useSignInContext = () => {
  const context = React.useContext(SignInContext);
  if (!context) {
    throw new Error('useSignInContext must be used within a SignInProvider');
  }
  return context;
};

// Root component with context provider
interface SignInRootProps {
  children: React.ReactNode;
  inviteCode?: string;
}

const SignInRoot = (props: SignInRootProps) => {
  const { children, inviteCode } = props;
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { invoke } = useLoginMutation();
  const { toast } = useToast();
  const { data: authConfig } = useGetAuthConfigQuery();

  // Show the email form while the config is loading; hide it only if the server disables it
  const isEmailAuthEnabled =
    !authConfig || authConfig.some((item: AuthConfigItem) => item.provider === 'email');

  const form = useForm<SigninFormValues>({
    resolver: zodResolver(signinFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const onSubmit = async (data: SigninFormValues) => {
    try {
      setIsLoading(true);
      const variables: LoginMutationVariables = { ...data };
      if (inviteCode) {
        variables.inviteCode = inviteCode;
      }
      const ret = await invoke(variables);
      if (ret.redirectUrl) {
        window.location.href = ret.redirectUrl;
      }
      setIsLoading(false);
    } catch (error) {
      showError(getErrorMessage(error));
      setIsLoading(false);
    }
  };

  return (
    <SignInContext.Provider
      value={{
        isLoading,
        setIsLoading,
        toast,
        showError,
        form,
        onSubmit,
        isEmailAuthEnabled,
      }}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>{children}</form>
      </Form>
    </SignInContext.Provider>
  );
};

SignInRoot.displayName = 'SignInRoot';

// Form component
interface SignInFormProps {
  buttonText?: string;
}

const SignInForm = (props: SignInFormProps) => {
  const { t } = useTranslation();
  const { buttonText = t('auth.signIn.submitButton') } = props;
  const { form, isLoading, isEmailAuthEnabled } = useSignInContext();

  // Don't render form if email auth is disabled
  if (!isEmailAuthEnabled) return null;

  return (
    <>
      <div className="grid gap-2">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.signIn.emailLabel')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('auth.signIn.emailPlaceholder')}
                  type="email"
                  autoComplete="email"
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
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.signIn.passwordLabel')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('auth.signIn.passwordPlaceholder')}
                  type="password"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <div className="flex flex-row justify-end">
                <span className="text-sm font-medium text-muted-foreground leading-none">
                  <Link to="/auth/reset-password" className="hover:text-primary">
                    {t('auth.signIn.forgotPassword')}
                  </Link>
                </span>
              </div>
            </FormItem>
          )}
        />
      </div>
      <Button className="w-full" type="submit" disabled={isLoading}>
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        {buttonText}
      </Button>
    </>
  );
};

SignInForm.displayName = 'SignInForm';

export { SignInForm, SignInRoot };
