import { forwardRef, useRef, createContext, useContext } from 'react';
import { useComposedRefs } from '@usertour-packages/react-compose-refs';
import { autoUpdate, ReferenceElement } from '@floating-ui/dom';
import { useFloating, offset, shift, limitShift, hide, flip, size } from '@floating-ui/react-dom';
import type { Placement } from '@floating-ui/dom';
import { getRegisteredIconNames, getIcon } from '@usertour-packages/icons';
import {
  Align,
  LauncherData,
  LauncherDataType,
  LauncherIconSource,
  Side,
  ThemeTypesSetting,
} from '@usertour/types';
import { cn } from '@usertour/helpers';
import {
  Popper,
  PopperContent,
  PopperContentPotal,
  PopperContentProps,
  PopperProps,
} from './popper';
import { useSettingsStyles } from './hooks/use-settings-styles';

function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

type Boundary = Element | null;

const formatIconName = (name: string): string => {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const generateIconsList = () => {
  const registeredNames = getRegisteredIconNames();
  const icons = registeredNames
    .map((name) => {
      const icon = getIcon(name);
      if (!icon) {
        return null;
      }
      return {
        ICON: icon,
        text: formatIconName(name),
        name,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  icons.sort((a, b) => a.name.localeCompare(b.name));

  return icons;
};

export const IconsList = generateIconsList();

interface LauncherContentProps {
  type?: LauncherDataType;
  onOpenChange?: (open: boolean) => void;
  onSizeChange?: (rect: { width: number; height: number }) => void;
  side?: Side;
  sideOffset?: number;
  align?: Align;
  alignOffset?: number;
  avoidCollisions?: boolean;
  collisionBoundary?: Boundary | Boundary[];
  collisionPadding?: number | Partial<Record<Side, number>>;
  sticky?: 'partial' | 'always';
  hideWhenDetached?: boolean;
  dir?: string;
  globalStyle?: string;
  updatePositionStrategy?: 'optimized' | 'always';
  referenceRef?: React.RefObject<any>;
  iconType?: string;
  iconSource?: LauncherIconSource;
  iconUrl?: string;
  buttonText?: string;
  zIndex: number;
}

interface LauncherRootProps {
  children: React.ReactNode;
  themeSettings: ThemeTypesSetting;
  data: LauncherData;
}

interface LauncherContextValue {
  globalStyle: string;
  themeSetting?: ThemeTypesSetting;
  data: LauncherData;
}

const LauncherContext = createContext<LauncherContextValue | null>(null);

const useLauncherContext = () => {
  const context = useContext(LauncherContext);
  if (!context) {
    throw new Error('useLauncherContext must be used within a LauncherRoot');
  }
  return context;
};

const LauncherRoot = (props: LauncherRootProps) => {
  const { children, themeSettings, data } = props;
  const { globalStyle, themeSetting } = useSettingsStyles(themeSettings);

  return (
    <LauncherContext.Provider value={{ globalStyle, themeSetting, data }}>
      {children}
    </LauncherContext.Provider>
  );
};

LauncherRoot.displayName = 'LauncherRoot';

interface LauncherContainerProps {
  children: React.ReactNode;
}

const LauncherContainer = forwardRef<HTMLDivElement, LauncherContainerProps>(
  ({ children }, ref) => {
    const { globalStyle } = useLauncherContext();
    const composedRefs = useComposedRefs(ref, (el: HTMLDivElement | null) => {
      if (el?.style) {
        el.style.cssText = globalStyle;
      }
    });
    return <div ref={composedRefs}>{children}</div>;
  },
);

LauncherContainer.displayName = 'LauncherContainer';

interface LauncherIconProps {
  type: LauncherDataType;
  iconType?: string;
  iconSource?: LauncherIconSource;
  iconUrl?: string;
  width?: number;
  height?: number;
}

const IconPreview = ({
  iconUrl,
  size,
}: {
  iconUrl: string;
  size: number;
}) => {
  return (
    <img
      src={iconUrl}
      alt="Custom icon"
      width={size}
      height={size}
      style={{ objectFit: 'contain' }}
    />
  );
};

const LauncherIcon = ({
  type,
  iconType,
  iconSource,
  iconUrl,
  width,
  height,
}: LauncherIconProps) => {
  const iconSize = width ?? height ?? 24;

  if (type === LauncherDataType.BEACON) {
    return (
      <>
        <div className="usertour-widget-beacon__ping" />
        <div className="usertour-widget-beacon__pong" />
      </>
    );
  }

  if (type === LauncherDataType.ICON) {
    if (
      (iconSource === LauncherIconSource.UPLOAD || iconSource === LauncherIconSource.URL) &&
      iconUrl
    ) {
      return <IconPreview iconUrl={iconUrl} size={iconSize} />;
    }

    const ActiveIcon = IconsList.find((item) => item.name === iconType)?.ICON;
    if (ActiveIcon) {
      return <ActiveIcon size={iconSize} />;
    }
  }

  return null;
};

LauncherIcon.displayName = 'LauncherIcon';

interface LauncherViewProps {
  className?: string;
  style: React.CSSProperties;
  dir?: string;
  type: LauncherDataType;
  iconType?: string;
  iconSource?: LauncherIconSource;
  iconUrl?: string;
  buttonText?: string;
}

const BUTTON_INLINE_STYLES: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--usertour-font-family)',
  fontSize: 'var(--usertour-font-size)',
  lineHeight: 'var(--usertour-line-height)',
  fontWeight: 'var(--usertour-primary-font-weight)' as React.CSSProperties['fontWeight'],
  borderRadius: 'var(--usertour-button-border-radius)',
  minWidth: 'var(--usertour-button-min-width)',
  paddingLeft: 'var(--usertour-button-px)',
  paddingRight: 'var(--usertour-button-px)',
  paddingTop:
    'calc((var(--usertour-button-height) - var(--usertour-line-height)) / 2 - var(--usertour-primary-border-width))',
  paddingBottom:
    'calc((var(--usertour-button-height) - var(--usertour-line-height)) / 2 - var(--usertour-primary-border-width))',
  backgroundColor: 'var(--usertour-primary)',
  color: 'var(--usertour-primary-foreground)',
  border: 'var(--usertour-primary-border-width) solid var(--usertour-primary-border-color)',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  boxSizing: 'border-box',
};

const LauncherView = forwardRef<HTMLDivElement, LauncherViewProps>(
  ({ className, style, dir, type, iconType, iconSource, iconUrl, buttonText }, ref) => {
    const { themeSetting } = useLauncherContext();
    const isClick = true;

    let classes = 'usertour-widget-launcher';

    if (type === LauncherDataType.BUTTON) {
      classes = `${classes} usertour-widget-launcher--button`;
    } else if (type === LauncherDataType.BEACON) {
      classes = `${classes} usertour-widget-beacon`;
    } else {
      classes = `${classes} usertour-widget-launcher--icon`;
    }

    if (isClick) {
      classes = `${classes} usertour-widget-launcher--activate-on-click`;
    }

    const mergedStyle =
      type === LauncherDataType.BUTTON ? { ...BUTTON_INLINE_STYLES, ...style } : style;

    return (
      <div className={cn(classes, className)} ref={ref} style={mergedStyle} dir={dir}>
        {type === LauncherDataType.BUTTON ? (
          buttonText
        ) : (
          <LauncherIcon
            type={type}
            iconType={iconType}
            iconSource={iconSource}
            iconUrl={iconUrl}
            width={themeSetting?.launcherIcon.size}
            height={themeSetting?.launcherIcon.size}
          />
        )}
      </div>
    );
  },
);

LauncherView.displayName = 'LauncherView';

const LauncherContent = forwardRef<HTMLDivElement, LauncherContentProps>((props, forwardedRef) => {
  const {
    side = 'bottom',
    sideOffset = 0,
    align = 'center',
    alignOffset = 0,
    avoidCollisions = true,
    collisionBoundary = [],
    collisionPadding: collisionPaddingProp = 0,
    sticky = 'partial',
    hideWhenDetached = false,
    dir = 'ltr',
    updatePositionStrategy = 'always',
    referenceRef,
    zIndex,
    type = LauncherDataType.ICON,
    iconType,
    iconSource,
    iconUrl,
    buttonText,
  } = props;

  const referenceEl = referenceRef?.current as ReferenceElement;
  const { globalStyle } = useLauncherContext();

  const desiredPlacement = `${side}${align !== 'center' ? `-${align}` : ''}` as Placement;
  const collisionPadding =
    typeof collisionPaddingProp === 'number'
      ? collisionPaddingProp
      : { top: 0, right: 0, bottom: 0, left: 0, ...collisionPaddingProp };

  const boundary = Array.isArray(collisionBoundary) ? collisionBoundary : [collisionBoundary];
  const hasExplicitBoundaries = boundary.length > 0;

  const detectOverflowOptions = {
    padding: collisionPadding,
    boundary: boundary.filter(isNotNull),
    altBoundary: hasExplicitBoundaries,
  };

  const { refs, floatingStyles, isPositioned } = useFloating({
    strategy: 'fixed',
    placement: desiredPlacement,
    whileElementsMounted: (...args) => {
      const cleanup = autoUpdate(...args, {
        animationFrame: updatePositionStrategy === 'always',
      });
      return cleanup;
    },
    elements: {
      reference: referenceEl,
    },
    middleware: [
      offset({
        mainAxis: sideOffset,
        alignmentAxis: alignOffset,
      }),
      avoidCollisions &&
        shift({
          mainAxis: true,
          crossAxis: false,
          limiter: sticky === 'partial' ? limitShift() : undefined,
          ...detectOverflowOptions,
        }),
      avoidCollisions && flip({ ...detectOverflowOptions }),
      size({
        ...detectOverflowOptions,
      }),
      hideWhenDetached && hide({ strategy: 'referenceHidden', ...detectOverflowOptions }),
    ],
  });

  const popperRef = useRef<HTMLDivElement | null>(null);
  const composedRefs = useComposedRefs(forwardedRef, popperRef, (node: any) =>
    refs.setFloating(node),
  );

  function parseStyleString(styleString: string): Record<string, string> {
    const result: Record<string, string> = {};
    const declarations = styleString.split(';').filter((declaration) => declaration.trim());

    for (const declaration of declarations) {
      const colonIndex = declaration.indexOf(':');
      if (colonIndex === -1) continue;

      const property = declaration.substring(0, colonIndex).trim();
      const value = declaration.substring(colonIndex + 1).trim();

      if (property && value) {
        result[property] = value;
      }
    }

    return result;
  }

  const combinedStyles = {
    ...parseStyleString(globalStyle),
    ...floatingStyles,
    zIndex: zIndex + 1,
    transform: isPositioned ? floatingStyles.transform : 'translate(0, -200%)',
    opacity: isPositioned ? '1' : '0',
  };

  return (
    <LauncherView
      ref={composedRefs}
      style={combinedStyles}
      dir={dir}
      type={type}
      iconType={iconType}
      iconSource={iconSource}
      iconUrl={iconUrl}
      buttonText={buttonText}
    />
  );
});

LauncherContent.displayName = 'LauncherContent';

const LauncherPopper = forwardRef<HTMLDivElement, Omit<PopperProps, 'globalStyle'>>(
  (props, ref) => {
    const { globalStyle } = useLauncherContext();
    return <Popper ref={ref} {...props} globalStyle={globalStyle} />;
  },
);

LauncherPopper.displayName = 'LauncherPopper';

const LauncherPopperContentPotal = forwardRef<HTMLDivElement, PopperContentProps>((props, ref) => {
  const { themeSetting, data } = useLauncherContext();

  return (
    <PopperContentPotal
      ref={ref}
      width={`${data.tooltip.width}px`}
      sideOffset={data.tooltip.alignment.sideOffset}
      alignOffset={data.tooltip.alignment.alignOffset}
      side={data.tooltip.alignment.side}
      align={
        data.tooltip.alignment.alignType === 'auto'
          ? 'center'
          : (data.tooltip.alignment.align ?? 'center')
      }
      avoidCollisions={data.tooltip.alignment.alignType === 'auto'}
      arrowSize={{
        width: themeSetting?.tooltip.notchSize ?? 20,
        height: (themeSetting?.tooltip.notchSize ?? 10) / 2,
      }}
      arrowColor={themeSetting?.mainColor.background}
      {...props}
    />
  );
});

LauncherPopperContentPotal.displayName = 'LauncherPopperContentPotal';

const LauncherPopperContent = PopperContent;

const LauncherContentWrapper = forwardRef<HTMLDivElement, LauncherContentProps>(
  ({ ...props }, ref) => {
    const { data } = useLauncherContext();
    const {
      side = 'bottom',
      align,
      sideOffset = 0,
      alignOffset = 0,
      alignType = 'auto',
    } = data.target.alignment;

    return (
      <LauncherContent
        side={side}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        align={alignType === 'auto' ? 'center' : (align ?? 'center')}
        avoidCollisions={alignType === 'auto'}
        type={data.type}
        iconType={data.iconType}
        iconSource={data.iconSource}
        iconUrl={data.iconUrl}
        buttonText={data.buttonText}
        ref={ref}
        {...props}
      />
    );
  },
);

LauncherContentWrapper.displayName = 'LauncherContentWrapper';

export {
  LauncherRoot,
  LauncherContent,
  LauncherContentWrapper,
  LauncherIcon,
  LauncherView,
  LauncherPopper,
  LauncherPopperContent,
  LauncherPopperContentPotal,
  LauncherContainer,
};
