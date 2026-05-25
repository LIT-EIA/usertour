import type { LauncherIconSource } from '@usertour/types';
import type { RemixiconComponentType } from '@usertour-packages/icons';

export interface IconPickerProps {
  type: string;
  iconSource?: LauncherIconSource;
  iconUrl?: string;
  zIndex: number;
  showNoIcon?: boolean;
  onChange: (updates: {
    iconType?: string;
    iconSource?: LauncherIconSource;
    iconUrl?: string;
  }) => void;
}

export interface RcUploadOption {
  file: File | Blob | string;
  onProgress?: (event: { percent?: number }) => void;
  onError?: (error: Error, body?: unknown) => void;
  onSuccess?: (body: { url: string }) => void;
}

export interface IconButtonProps {
  icon: RemixiconComponentType;
  text: string;
  isSelected: boolean;
  onClick: () => void;
}

export interface IconGridProps {
  selectedType: string;
  onIconSelect: (name: string) => void;
}

export interface IconPreviewProps {
  iconUrl: string;
  alt: string;
  size?: 'small' | 'medium' | 'large';
}

export interface IconTriggerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  iconSource: LauncherIconSource;
  iconUrl?: string;
  iconType: string;
  activeText: string;
}

export interface BuiltinIconTabProps {
  selectedType: string;
  onIconSelect: (name: string) => void;
}

export interface UploadIconTabProps {
  iconUrl?: string;
  iconSource: LauncherIconSource;
  onUploadSuccess: (url: string) => void;
  onRemove?: () => void;
}

export interface UrlIconTabProps {
  iconUrl?: string;
  iconSource: LauncherIconSource;
  onUrlSubmit: (url: string) => void;
  isUploading: boolean;
}
