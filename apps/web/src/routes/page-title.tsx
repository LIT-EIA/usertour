import { TFunction } from 'i18next';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { Params, useParams } from 'react-router-dom';

const contentTabKeys: Record<string, string> = {
  detail: 'contents.detail.tabs.content',
  analytics: 'contents.detail.tabs.analytics',
  versions: 'contents.detail.tabs.versions',
};

const settingsKeys: Record<string, string> = {
  companies: 'settings.nav.sections.general',
  themes: 'settings.nav.sections.themes',
  environments: 'settings.nav.sections.environments',
  attributes: 'settings.nav.sections.attributes',
  events: 'settings.nav.sections.events',
  localizations: 'settings.nav.sections.localizations',
  team: 'settings.nav.sections.team',
  billing: 'settings.nav.sections.billing',
  subscription: 'settings.nav.sections.subscription',
  account: 'settings.nav.sections.account',
  api: 'settings.nav.sections.api',
  integrations: 'settings.nav.sections.integrations',
};

const contentTypeTitle = (t: TFunction, contentType?: string) =>
  contentType ? t(`contents.list.${contentType}.title`, contentType) : '';

// Builds the page-specific part of the document title (WCAG 2.4.2 Page Titled)
const getPageParts = (route: string, params: Readonly<Params>, t: TFunction): string[] => {
  switch (route) {
    case 'SignIn':
      return [t('pageTitles.signIn')];
    case 'SignUp':
      return [t('pageTitles.signUp')];
    case 'ResetPassword':
      return [t('pageTitles.resetPassword')];
    case 'Invite':
      return [t('pageTitles.invite')];
    case 'Registration':
      return [t('pageTitles.registration')];
    case 'PasswordReset':
      return [t('pageTitles.passwordReset')];
    case 'Dashboard':
      return [t('pageTitles.overview')];
    case 'ContentList':
      return [contentTypeTitle(t, params.contentType)];
    case 'ContentDetail': {
      const tab = params.type && contentTabKeys[params.type];
      return [contentTypeTitle(t, params.contentType), tab ? t(tab) : t('pageTitles.builder')];
    }
    case 'ContentLocalization':
      return [contentTypeTitle(t, params.contentType), t('pageTitles.localization')];
    case 'ContentBuilder':
      return [contentTypeTitle(t, params.contentType), t('pageTitles.builder')];
    case 'UserList':
      return [t('users.detail.breadcrumb')];
    case 'UserDetail':
      return [t('pageTitles.userDetail')];
    case 'SessionDetail':
      return [t('pageTitles.sessionDetail')];
    case 'CompanyList':
      return [t('companies.detail.breadcrumb')];
    case 'CompanyDetail':
      return [t('pageTitles.companyDetail')];
    case 'InstallPlugins':
      return [t('nav.installPlugins')];
    case 'SettingsThemeDetail':
      return [t('settings.nav.heading'), t('pageTitles.themeDetail')];
    case 'Settings': {
      const section = params.settingType && settingsKeys[params.settingType];
      return [t('settings.nav.heading'), ...(section ? [t(section)] : [])];
    }
    default:
      return [];
  }
};

export const PageTitle = ({ route }: { route?: string }) => {
  const { t } = useTranslation();
  const params = useParams();
  const parts = route ? getPageParts(route, params, t).filter(Boolean) : [];
  const title = parts.length
    ? t('pageTitles.template', {
        page: parts.join(' - '),
        interpolation: { escapeValue: false },
      })
    : t('productName');

  return (
    <Helmet>
      <title>{title}</title>
    </Helmet>
  );
};

PageTitle.displayName = 'PageTitle';
