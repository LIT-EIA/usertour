import { CardContent, CardFooter } from '@usertour-packages/card';
import { useParams } from 'react-router-dom';
import { useGetInviteQuery } from '@usertour-packages/shared-hooks';
import {
  SignInDivider,
  SignInForm,
  SignInSocialProviders,
  SignInRoot,
} from './components/sign-in-form';
import { Card, CardHeader, CardTitle } from '@usertour-packages/card';
import {
  RegistrationFormFields,
  RegistrationRoot,
  RegistrationSubmitButton,
} from './components/registration-form';
import React from 'react';
import { useTranslation } from 'react-i18next';

const InviteHeader = () => {
  const { inviteCode, showRegistration } = useInviteContext();
  const { data } = useGetInviteQuery(inviteCode);
  const { t } = useTranslation();
  return (
    <CardHeader className="space-y-1 text-center">
      <CardTitle>
        <p className="text-lg font-normal">
          {t('auth.invite.titleTemplate', {
            userName: data?.user?.name,
            projectName: data?.project?.name,
          })}
        </p>
        <p className="text-sm text-muted-foreground">
          {showRegistration
            ? t('auth.invite.signUpDescription')
            : t('auth.invite.signInDescription')}
        </p>
      </CardTitle>
    </CardHeader>
  );
};

// Add context definition
type InviteContextType = {
  showRegistration: boolean;
  setShowRegistration: (show: boolean) => void;
  inviteCode: string;
};

const InviteContext = React.createContext<InviteContextType | undefined>(undefined);

// Add hook for using the context
const useInviteContext = () => {
  const context = React.useContext(InviteContext);
  if (!context) {
    throw new Error('useInviteContext must be used within an InviteProvider');
  }
  return context;
};

// Update SignInFooter to use context
const SignInFooter = () => {
  const { setShowRegistration } = useInviteContext();
  const { t } = useTranslation();
  return (
    <CardFooter>
      <div className="text-center text-sm text-muted-foreground">
        {t('auth.signIn.noAccountPrompt')}{' '}
        <button
          type="button"
          className="underline underline-offset-4 hover:text-primary cursor-pointer"
          onClick={() => setShowRegistration(true)}
        >
          {t('auth.signIn.signUpCta')}
        </button>
      </div>
    </CardFooter>
  );
};

const RegistrationFooter = () => {
  const { setShowRegistration } = useInviteContext();
  const { t } = useTranslation();
  return (
    <CardFooter>
      <div className="text-center text-sm text-muted-foreground">
        {t('auth.magicLink.alreadyHaveAccount')}{' '}
        <button
          type="button"
          className="underline underline-offset-4 hover:text-primary cursor-pointer"
          onClick={() => setShowRegistration(false)}
        >
          {t('auth.magicLink.signInInstead')}
        </button>
      </div>
    </CardFooter>
  );
};

const InviteBody = () => {
  const { showRegistration, inviteCode } = useInviteContext();

  if (showRegistration) {
    return (
      <RegistrationRoot inviteCode={inviteCode}>
        <CardContent className="grid gap-4">
          <RegistrationFormFields />
          <RegistrationSubmitButton buttonText="Create account and join" />
          <RegistrationFooter />
        </CardContent>
      </RegistrationRoot>
    );
  }
  return (
    <SignInRoot inviteCode={inviteCode}>
      <CardContent className="grid gap-4">
        <SignInSocialProviders />
        <SignInDivider />
        <SignInForm buttonText="Login and join" />
        <SignInFooter />
      </CardContent>
    </SignInRoot>
  );
};

// Update Invite component
export const Invite = () => {
  const { inviteCode } = useParams();
  const [showRegistration, setShowRegistration] = React.useState(true);

  if (!inviteCode) {
    return null;
  }

  const value = {
    showRegistration,
    setShowRegistration,
    inviteCode,
  };

  return (
    <InviteContext.Provider value={value}>
      <Card>
        <InviteHeader />
        <InviteBody />
      </Card>
    </InviteContext.Provider>
  );
};

Invite.displayName = 'Invite';
