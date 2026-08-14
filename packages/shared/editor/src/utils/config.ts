import {
  ButtonIcon,
  ImageIcon,
  InputIcon,
  RulerHorizontalIcon,
  StarIcon,
  TextAlignLeftIcon,
  TextIcon,
  VideoIcon,
} from '@radix-ui/react-icons';
import { MultiCheckIcon, NpsIcon } from '@usertour-packages/icons';
import { TFunction } from 'i18next';
import { ContentEditorElement, ContentEditorElementType } from '../types/editor';

type ContentTypeConfig = {
  name: string;
  icon: typeof TextIcon;
  element: ContentEditorElement;
};

/**
 * Static English config, kept for callers outside this package (e.g. session/analytics
 * displays) that read `.name` without access to the active i18next instance.
 * Editor UI (the sidebar element picker) should use `getContentTypesConfig(t)` instead.
 */
export const contentTypesConfig = [
  {
    name: 'Text',
    icon: TextIcon,
    element: {
      type: ContentEditorElementType.TEXT,
      data: [
        {
          type: 'paragraph',
          children: [{ text: 'Write text here' }],
        },
      ],
    },
  },
  {
    name: 'Button',
    icon: ButtonIcon,
    element: {
      type: ContentEditorElementType.BUTTON,
      data: {
        action: 'goto',
        text: 'Next',
        type: 'default',
      },
    },
  },
  {
    name: 'Image',
    icon: ImageIcon,
    element: { type: ContentEditorElementType.IMAGE, url: '' },
  },
  {
    name: 'Embed',
    icon: VideoIcon,
    element: { type: ContentEditorElementType.EMBED, url: '' },
  },
  {
    name: 'NPS',
    icon: NpsIcon,
    element: {
      type: ContentEditorElementType.NPS,
      data: { name: '', lowLabel: '', highLabel: '' },
    },
  },
  {
    name: 'Star Rating',
    icon: StarIcon,
    element: {
      type: ContentEditorElementType.STAR_RATING,
      data: { name: '', lowRange: 1, highRange: 5 },
    },
  },
  {
    name: 'Scale',
    icon: RulerHorizontalIcon,
    element: {
      type: ContentEditorElementType.SCALE,
      data: { name: '', lowRange: 1, highRange: 5 },
    },
  },
  {
    name: 'Single Line Text',
    icon: InputIcon,
    element: {
      type: ContentEditorElementType.SINGLE_LINE_TEXT,
      data: { name: '', placeholder: '', buttonText: '', required: false },
    },
  },
  {
    name: 'Multi Line Text',
    icon: TextAlignLeftIcon,
    element: {
      type: ContentEditorElementType.MULTI_LINE_TEXT,
      data: { name: '', placeholder: '', buttonText: '', required: false },
    },
  },
  {
    name: 'Multiple Choice',
    icon: MultiCheckIcon,
    element: {
      type: ContentEditorElementType.MULTIPLE_CHOICE,
      data: {
        name: '',
        options: [
          { label: '', value: '' },
          { label: '', value: '' },
        ],
        shuffleOptions: false,
        enableOther: false,
        allowMultiple: false,
      },
    },
  },
] as ContentTypeConfig[];

/** Translated variant for in-package editor UI (sidebar element picker). */
export const getContentTypesConfig = (t: TFunction) =>
  [
    {
      name: t('contentBuilder.editor.sidebar.elementTypes.text'),
      icon: TextIcon,
      element: {
        type: ContentEditorElementType.TEXT,
        data: [
          {
            type: 'paragraph',
            children: [{ text: t('contentBuilder.editor.defaultContent.text') }],
          },
        ],
      },
    },
    {
      name: t('contentBuilder.editor.sidebar.elementTypes.button'),
      icon: ButtonIcon,
      element: {
        type: ContentEditorElementType.BUTTON,
        data: {
          action: 'goto',
          text: t('contentBuilder.editor.defaultContent.nextButtonText'),
          type: 'default',
        },
      },
    },
    {
      name: t('contentBuilder.editor.sidebar.elementTypes.image'),
      icon: ImageIcon,
      element: { type: ContentEditorElementType.IMAGE, url: '' },
    },
    {
      name: t('contentBuilder.editor.sidebar.elementTypes.embed'),
      icon: VideoIcon,
      element: { type: ContentEditorElementType.EMBED, url: '' },
    },
    {
      name: t('contentBuilder.editor.sidebar.elementTypes.nps'),
      icon: NpsIcon,
      element: {
        type: ContentEditorElementType.NPS,
        data: { name: '', lowLabel: '', highLabel: '' },
      },
    },
    {
      name: t('contentBuilder.editor.sidebar.elementTypes.starRating'),
      icon: StarIcon,
      element: {
        type: ContentEditorElementType.STAR_RATING,
        data: { name: '', lowRange: 1, highRange: 5 },
      },
    },
    {
      name: t('contentBuilder.editor.sidebar.elementTypes.scale'),
      icon: RulerHorizontalIcon,
      element: {
        type: ContentEditorElementType.SCALE,
        data: { name: '', lowRange: 1, highRange: 5 },
      },
    },
    {
      name: t('contentBuilder.editor.sidebar.elementTypes.singleLineText'),
      icon: InputIcon,
      element: {
        type: ContentEditorElementType.SINGLE_LINE_TEXT,
        data: { name: '', placeholder: '', buttonText: '', required: false },
      },
    },
    {
      name: t('contentBuilder.editor.sidebar.elementTypes.multiLineText'),
      icon: TextAlignLeftIcon,
      element: {
        type: ContentEditorElementType.MULTI_LINE_TEXT,
        data: { name: '', placeholder: '', buttonText: '', required: false },
      },
    },
    {
      name: t('contentBuilder.editor.sidebar.elementTypes.multipleChoice'),
      icon: MultiCheckIcon,
      element: {
        type: ContentEditorElementType.MULTIPLE_CHOICE,
        data: {
          name: '',
          options: [
            { label: '', value: '' },
            { label: '', value: '' },
          ],
          shuffleOptions: false,
          enableOther: false,
          allowMultiple: false,
        },
      },
    },
  ] as ContentTypeConfig[];
