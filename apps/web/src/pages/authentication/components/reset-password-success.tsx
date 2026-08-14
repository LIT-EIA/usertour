'use client';

import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const ResetPasswordSuccess = () => {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl  font-semibold tracking-tight">{t('auth.resetPassword.success.title')}</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {t('auth.resetPassword.success.description')}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-col">
        <div className="pt-4 text-center text-sm text-muted-foreground">
          <Link to="/auth/signin" className="underline underline-offset-4 hover:text-primary">
            {t('auth.resetPassword.backToSignIn')}
          </Link>{' '}
        </div>
      </CardFooter>
    </Card>
  );
};

ResetPasswordSuccess.displayName = 'ResetPasswordSuccess';
