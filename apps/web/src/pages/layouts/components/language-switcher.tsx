import { Button } from '@usertour-packages/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { cn } from '@usertour/helpers';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'fr-CA', label: 'Français (Canada)' },
];

const resolveLanguage = (langCode: string) =>
  languages.find((l) => langCode.startsWith(l.code.split('-')[0])) ?? languages[0];

interface LanguageSwitcherProps {
  className?: string;
}

export const LanguageSwitcher = ({ className }: LanguageSwitcherProps) => {
  const { i18n } = useTranslation();
  const current = resolveLanguage(i18n.language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('w-[168px] gap-1.5 text-foreground', className)}
        >
          <Globe className="h-4 w-4 shrink-0" />
          <span className="truncate">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[--radix-dropdown-menu-trigger-width] min-w-[--radix-dropdown-menu-trigger-width]"
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={current.code === lang.code ? 'font-medium' : ''}
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

LanguageSwitcher.displayName = 'LanguageSwitcher';
