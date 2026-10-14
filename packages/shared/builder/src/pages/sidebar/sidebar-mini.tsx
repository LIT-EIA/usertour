import {
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  SlideLeftIcon,
  SlideRightIcon,
} from '@usertour-packages/icons';
import { cn } from '@usertour/helpers';
import anime from 'animejs/lib/anime.es.js';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useBuilderContext } from '../../contexts';

interface SideBarMiniProps {
  // container: React.MutableRefObject<HTMLDivElement>;
  container: React.RefObject<HTMLDivElement>;
  containerWidth?: number;
}

export const SidebarMini = (props: SideBarMiniProps) => {
  const { t } = useTranslation();
  const { position, setPosition } = useBuilderContext();
  const { container, containerWidth = 312 } = props;
  const [isMini, setIsMini] = useState(false);
  const handleHideSideBar = () => {
    setIsMini(!isMini);
  };
  const getTranslateX = (isMini: boolean) => {
    if (position === 'left') {
      return isMini ? `-${containerWidth}px` : '0px';
    }
    return isMini ? `${containerWidth}px` : '0px';
  };
  useEffect(() => {
    const translateX = getTranslateX(isMini);
    anime({
      targets: container.current,
      translateX,
      duration: 500,
      easing: 'easeInCubic',
    });
  }, [isMini]);

  useEffect(() => {
    if (container.current) {
      const translateX = getTranslateX(isMini);
      container.current.style.transform = `translateX(${translateX})`;
    }
  }, [position]);

  return (
    <>
      <div
        className={cn(
          'absolute w-8 h-16 bg-background-700 flex flex-col justify-around	 text-center items-center	top-6 ',
          position === 'right' ? '-left-6 rounded-l-lg' : '-right-6 rounded-r-lg ',
        )}
      >
        {position === 'right' && (
          <button
            type="button"
            aria-label={t('contentBuilder.common.switchSide')}
            className="inline-flex cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => {
              setPosition('left');
            }}
          >
            <SlideLeftIcon width={20} height={20} aria-hidden="true" />
          </button>
        )}
        {position === 'left' && (
          <button
            type="button"
            aria-label={t('contentBuilder.common.switchSide')}
            className="inline-flex cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => {
              setPosition('right');
            }}
          >
            <SlideRightIcon width={20} height={20} aria-hidden="true" />
          </button>
        )}
        {position === 'left' && isMini && (
          <button
            type="button"
            aria-label={t('contentBuilder.common.expandPanel')}
            className="inline-flex cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={handleHideSideBar}
          >
            <DoubleArrowRightIcon width={20} height={20} aria-hidden="true" />
          </button>
        )}
        {position === 'left' && !isMini && (
          <button
            type="button"
            aria-label={t('contentBuilder.common.collapsePanel')}
            className="inline-flex cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={handleHideSideBar}
          >
            <DoubleArrowLeftIcon width={20} height={20} aria-hidden="true" />
          </button>
        )}
        {position === 'right' && isMini && (
          <button
            type="button"
            aria-label={t('contentBuilder.common.expandPanel')}
            className="inline-flex cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={handleHideSideBar}
          >
            <DoubleArrowLeftIcon width={20} height={20} aria-hidden="true" />
          </button>
        )}
        {position === 'right' && !isMini && (
          <button
            type="button"
            aria-label={t('contentBuilder.common.collapsePanel')}
            className="inline-flex cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={handleHideSideBar}
          >
            <DoubleArrowRightIcon width={20} height={20} aria-hidden="true" />
          </button>
        )}
      </div>
    </>
  );
};
SidebarMini.displayName = 'SidebarMini';
