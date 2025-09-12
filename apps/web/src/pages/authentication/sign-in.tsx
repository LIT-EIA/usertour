'use client';

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import {
  SignInSocialProviders,
  SignInDivider,
  SignInForm,
  SignInRoot,
} from './components/sign-in-form';

// Footer component
const SignInFooter = () => <CardFooter></CardFooter>;

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
  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-semibold tracking-tight">Sign in to UserTour</CardTitle>
      </CardHeader>
      <SignInBody />
    </Card>
  );
};

SignIn.displayName = 'SignIn';

export { SignIn };
