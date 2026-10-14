import { useAppContext } from '@/contexts/app-context';
import {
  ChecklistIcon,
  CompanyIcon,
  FlowIcon,
  GroupIcon2,
  LauncherIcon,
  SettingsIcon,
} from '@usertour-packages/icons';
import { TooltipContent } from '@usertour-packages/tooltip';
import { TooltipTrigger } from '@usertour-packages/tooltip';
import { TooltipProvider } from '@usertour-packages/tooltip';
import { Tooltip } from '@usertour-packages/tooltip';
import { cn } from '@usertour/helpers';
import { Link, useMatches, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdminEnvSwitcher } from './admin-env-switcher';
import { AdminUserNav } from './admin-user-nav';

// Extract common button styles to reduce repetition
const commonButtonStyles =
  'inline-flex main-transition items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border dark:hover:border-dark-accent hover:shadow hover:border-input hover:bg-background !text-foreground hover:!text-foreground dark:!text-foreground dark:hover:!text-dark-accent-foreground h-9 w-9 p-0 relative unstyled-button border-transparent shadow-none bg-transparent dark:shadow-none dark:bg-transparent dark:hover:bg-secondary';

// Focus ring lives on the link, since it is the focusable element
const commonLinkStyles =
  'block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

// Extract common icon styles
const commonIconStyles = '!h-[18px] !w-[18px] text-primary-modified dark:text-foreground/[60%]';

const navigations = [
  {
    name: 'contents.list.flows.title',
    href: '/flows',
    contentType: 'flows',
    routeIds: ['content'],
    icon: FlowIcon,
  },
  {
    name: 'contents.list.launchers.title',
    href: '/launchers',
    contentType: 'launchers',
    routeIds: ['launchers'],
    icon: LauncherIcon,
  },
  {
    name: 'contents.list.checklists.title',
    href: '/checklists',
    contentType: 'checklists',
    routeIds: ['checklists'],
    icon: ChecklistIcon,
  },
  {
    name: 'users.detail.breadcrumb',
    href: '/users',
    routeIds: ['users'],
    icon: GroupIcon2,
  },
  {
    name: 'companies.detail.breadcrumb',
    href: '/companies',
    routeIds: ['companies'],
    icon: CompanyIcon,
  },
  {
    name: 'settings.nav.heading',
    href: '/settings/themes',
    routeIds: [
      'settings',
      'settings-account',
      'settings-themes',
      'settings-environments',
      'settings-attributes',
      'settings-localizations',
      'settings-events',
      'settings-detail',
    ],
    icon: SettingsIcon,
  },
];

// Create a reusable NavButton component.
// The link is the only interactive element; the button look is a presentational <div> inside it
// (no nested <a><button>). The link is named via aria-label with the same text as the tooltip,
// because the visible content is an icon and the tooltip text is not in the DOM until hovered.
const NavButton = ({
  isActive,
  icon: Icon,
  name,
  to,
  ...props
}: {
  isActive: boolean;
  icon: React.ComponentType<{
    className?: string;
    'aria-hidden'?: React.AriaAttributes['aria-hidden'];
  }>;
  name: string;
  to: string;
} & React.HTMLAttributes<HTMLAnchorElement>) => {
  const { t } = useTranslation();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={to}
            aria-label={t(name)}
            aria-current={isActive ? 'page' : undefined}
            className={commonLinkStyles}
            {...props}
          >
            <div
              className={cn(
                commonButtonStyles,
                isActive ? 'bg-background shadow border-input' : '',
              )}
            >
              <Icon
                className={cn(commonIconStyles, isActive ? 'text-primary' : '')}
                aria-hidden="true"
              />
            </div>
          </Link>
        </TooltipTrigger>
        {/* Clear the 4px focus ring (2px offset + 2px ring) so the tooltip never touches it */}
        <TooltipContent side="right" sideOffset={10}>
          {t(name)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const AdminMainNewNav = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => {
  const matches = useMatches();
  const { environment, project } = useAppContext();
  const { contentType } = useParams();
  const { t } = useTranslation();

  const isNavActive = (nav: (typeof navigations)[0]) =>
    nav.contentType
      ? nav.contentType === contentType
      : matches && nav.routeIds.includes(matches[0].id);

  const getNavPath = (nav: (typeof navigations)[0]) =>
    nav.href.startsWith('/settings')
      ? `/project/${project?.id}${nav.href}`
      : `/env/${environment?.id}${nav.href}`;

  return (
    <nav
      aria-label={t('nav.mainNavigation')}
      className="pt-5 pb-3 px-2 items-center flex flex-col min-h-screen flex-shrink-0"
    >
      <AdminEnvSwitcher />

      <div className="flex flex-col justify-between gap-3 h-full">
        <div className="flex flex-col gap-3 mt-6">
          {navigations
            .filter((nav) => !nav.href.startsWith('/settings'))
            .map((nav, index) => (
              <NavButton
                key={index}
                to={getNavPath(nav)}
                name={nav.name}
                isActive={isNavActive(nav)}
                icon={nav.icon}
                {...props}
              />
            ))}
        </div>
        <div className="flex flex-col gap-3">
          {navigations
            .filter((nav) => nav.href.startsWith('/settings'))
            .map((nav, index) => (
              <NavButton
                key={index}
                to={getNavPath(nav)}
                name={nav.name}
                isActive={isNavActive(nav)}
                icon={nav.icon}
                {...props}
              />
            ))}
          <AdminUserNav />
        </div>
      </div>
    </nav>
  );
};

export const AdminMainNav = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => {
  const matches = useMatches();
  const { environment, project } = useAppContext();
  const { contentType } = useParams();

  return (
    <nav className={cn('flex items-center space-x-4 lg:space-x-6', className)} {...props}>
      {navigations.map((nav, index) => (
        <Link
          to={
            nav.name !== 'Settings'
              ? `/project/${project?.id}${nav.href}`
              : `/env/${environment?.id}${nav.href}`
          }
          key={index}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            (contentType === 'trackers' && nav.routeIds.includes(contentType)) ||
              (contentType !== 'trackers' && matches && nav.routeIds.includes(matches[0].id))
              ? ''
              : 'text-muted-foreground',
          )}
        >
          {nav.name}
        </Link>
      ))}
    </nav>
  );
};

AdminMainNav.displayName = 'AdminMainNav';
