import { useReducer } from 'react';
import { useTranslation } from 'react-i18next';

export const Button = () => {
  const { t } = useTranslation();
  const [count, increase] = useReducer((c) => c + 1, 0);
  return (
    <button
      onClick={() => increase()}
      type="button"
      className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
    >
      {t('contentBuilder.common.countLabel')}
      <span className="inline-flex items-center justify-center w-8 h-4 ml-2 text-xs font-semibold text-blue-800 bg-blue-200 rounded-full">
        {count}
      </span>
    </button>
  );
};

Button.displayName = 'Button';
