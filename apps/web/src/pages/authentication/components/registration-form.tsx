'use client';

import React, { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@usertour-packages/button';
import { getErrorMessage } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@usertour-packages/form';
import { Checkbox } from '@usertour-packages/checkbox';
import { Input } from '@usertour-packages/input';
import { Link, useParams } from 'react-router-dom';
import { SpinnerIcon } from '@usertour-packages/icons';
import { cn } from '@usertour/helpers';
import { useSignupMutation } from '@usertour-packages/shared-hooks';
import {
  PersonNameFields,
  createPersonNameSchema,
} from '@/components/molecules/person-name-fields';

import type { TFunction } from 'i18next';

// Form validation schema (built with `t` so name errors are translated)
const createRegistFormSchemaBase = (t: TFunction) =>
  createPersonNameSchema(t).extend({
    companyName: z
      .string({
        required_error: 'Please input your company name.',
      })
      .max(30)
      .min(4)
      .optional(),
    password: z
      .string({
        required_error: 'Please input your password.',
      })
      .max(20)
      .min(12, 'Password must be at least 12 characters'),
    confirmPassword: z.string({
      required_error: 'Please confirm your password.',
    }),
    isAccept: z.boolean(),
  });

const passwordMatchRefine = (data: { password?: string; confirmPassword?: string }) =>
  data.password === data.confirmPassword;

type RegistFormValues = z.infer<ReturnType<typeof createRegistFormSchemaBase>>;

const defaultValues: Partial<RegistFormValues> = {
  firstName: '',
  lastName: '',
  isAccept: false,
  companyName: '',
  password: '',
  confirmPassword: '',
};

// Context type definition
type RegistrationContextType = {
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
  form: ReturnType<typeof useForm<RegistFormValues>>;
  onSubmit: (data: RegistFormValues) => Promise<void>;
  showError: (title: string) => void;
  registrationCode: string | undefined;
  inviteCode: string | undefined;
};

// Create context
const RegistrationContext = React.createContext<RegistrationContextType | undefined>(undefined);

// Custom hook for using Registration context
const useRegistrationContext = () => {
  const context = React.useContext(RegistrationContext);
  if (!context) {
    throw new Error('useRegistrationContext must be used within a RegistrationProvider');
  }
  return context;
};

// Root component with context provider
const RegistrationRoot = ({
  children,
  inviteCode,
}: {
  children: React.ReactNode;
  inviteCode?: string;
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // const [signUpMutation] = useMutation(signUp);
  const { invoke } = useSignupMutation();
  const { toast } = useToast();
  const { registrationCode } = useParams();
  const { t } = useTranslation();

  const formSchema = useMemo(() => {
    const base = createRegistFormSchemaBase(t);
    const passwordsMatch = {
      message: t('auth.errors.passwordsDoNotMatch'),
      path: ['confirmPassword'],
    };
    // Invitees join an existing project, so there's no project (company) name to ask for.
    return inviteCode
      ? base.omit({ companyName: true }).refine(passwordMatchRefine, passwordsMatch)
      : base.refine(passwordMatchRefine, passwordsMatch);
  }, [t, inviteCode]);

  const form = useForm<RegistFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...defaultValues,
      ...(inviteCode && { companyName: undefined }),
    },
    mode: 'onChange',
  });

  const showError = (title: string) => {
    toast({
      variant: 'destructive',
      title,
    });
  };

  const onSubmit = async (formData: RegistFormValues) => {
    const { isAccept, confirmPassword: _confirmPassword, ...others } = formData;
    const code = inviteCode ? inviteCode : registrationCode;
    const isInvite = !!inviteCode;

    if (!isAccept || !code) {
      showError(t('auth.errors.acceptTerms'));
      return;
    }
    try {
      setIsLoading(true);
      const baseVariables = {
        firstName: others.firstName,
        lastName: others.lastName,
        password: others.password,
        code,
        isInvite,
      };

      const variables = isInvite
        ? baseVariables
        : {
            ...baseVariables,
            companyName: others.companyName,
          };
      const data = await invoke(variables);
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (error) {
      showError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <RegistrationContext.Provider
      value={{
        isLoading,
        setIsLoading,
        form,
        onSubmit,
        showError,
        registrationCode,
        inviteCode,
      }}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>{children}</form>
      </Form>
    </RegistrationContext.Provider>
  );
};

RegistrationRoot.displayName = 'RegistrationRoot';

// Form Fields component
const RegistrationFormFields = () => {
  const { form, inviteCode } = useRegistrationContext();
  const { t } = useTranslation();

  return (
    <>
      <div className="grid gap-4">
        <PersonNameFields
          control={form.control}
          firstNamePlaceholder={t('auth.signUp.firstNamePlaceholder')}
          lastNamePlaceholder={t('auth.signUp.lastNamePlaceholder')}
          isOwnName
        />
        {!inviteCode && (
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.signUp.projectNameLabel')}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('auth.signUp.projectNamePlaceholder')}
                    autoComplete="organization"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.signUp.passwordLabel')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('auth.signUp.passwordPlaceholder')}
                  type="password"
                  autoComplete="new-password"
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
              <FormLabel>{t('auth.setupAdmin.confirmPasswordLabel')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('auth.setupAdmin.confirmPasswordPlaceholder')}
                  type="password"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="flex flex-row items-start space-x-3">
        <FormField
          control={form.control}
          name="isAccept"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <span className="text-sm text-muted-foreground">
          {t('auth.signUp.acceptTermsPrefix')}{' '}
          <Link to="/terms" className="underline underline-offset-4 hover:text-primary">
            {t('auth.signUp.termsOfService')}
          </Link>{' '}
          {t('auth.signUp.and')}{' '}
          <Link to="/privacy" className="underline underline-offset-4 hover:text-primary">
            {t('auth.signUp.privacyPolicy')}
          </Link>
        </span>
      </div>
    </>
  );
};

RegistrationFormFields.displayName = 'RegistrationFormFields';

interface RegistrationSubmitButtonProps {
  buttonText?: string;
  className?: string;
}

const RegistrationSubmitButton = (props: RegistrationSubmitButtonProps) => {
  const { t } = useTranslation();
  const { buttonText = t('auth.signUp.submitButton'), className } = props;
  const { isLoading } = useRegistrationContext();

  return (
    <Button className={cn('w-full', className)} type="submit" disabled={isLoading}>
      {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
      {buttonText}
    </Button>
  );
};

RegistrationSubmitButton.displayName = 'RegistrationSubmitButton';

export { RegistrationFormFields, RegistrationSubmitButton, RegistrationRoot };
