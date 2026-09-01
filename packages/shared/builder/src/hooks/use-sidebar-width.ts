import { useTranslation } from 'react-i18next';

// French UI labels run longer than English ones, so the fixed w-80 (20rem)
// side panel clips text; widen it to 23rem for French locales.
export const useSidebarWidthClass = () => {
  const { i18n } = useTranslation();
  return i18n.language?.startsWith('fr') ? 'w-[23rem]' : 'w-80';
};
