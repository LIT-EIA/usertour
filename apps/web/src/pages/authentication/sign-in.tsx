'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import {
  SignInSocialProviders,
  SignInDivider,
  SignInForm,
  SignInRoot,
} from './components/sign-in-form';
import { useTranslation } from 'react-i18next';

// Footer component
const SignInFooter = () => <CardFooter />;

SignInFooter.displayName = 'SignInFooter';

const SignInBody = () => {
  return (
    <SignInRoot>
      <CardContent className="grid gap-4">
        <SignInSocialProviders />
        <SignInDivider />
        <SignInForm />
        <SignInFooter />
      </CardContent>
    </SignInRoot>
  );
};

SignInBody.displayName = 'SignInBody';

const SignIn = () => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          {t('auth.signIn.title')}
        </CardTitle>
      </CardHeader>
      <SignInBody />
    </Card>
  );
};

SignIn.displayName = 'SignIn';

export { SignIn };
