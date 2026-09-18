import { Extension, Node, mergeAttributes } from '@tiptap/core';
import TextStyle from '@tiptap/extension-text-style';

/**
 * Editor extensions specific to this project.
 */

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

/**
 * Font size, stored as an inline style on a <span>.
 * The published page allows font-size in its sanitiser, so this survives.
 */
export const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return { types: ['textStyle'] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, '') || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});

/**
 * A gallery block: several images shown as a grid.
 * Rendered as <div class="ru-gallery"> so the public stylesheet can lay it
 * out, and so the sanitiser keeps it (ru- is an allowed class prefix).
 */
export const Gallery = Node.create({
  name: 'gallery',
  group: 'block',
  content: 'image+',
  draggable: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'div.ru-gallery' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'ru-gallery' }), 0];
  },
});

/** Builds the document node for a gallery of the given image URLs. */
export function galleryContent(urls: string[]) {
  return {
    type: 'gallery',
    content: urls.map((src) => ({ type: 'image', attrs: { src } })),
  };
}

export { TextStyle };

/** The sizes offered in the toolbar. */
export const FONT_SIZES: { label: string; value: string }[] = [
  { label: 'Very small', value: '12px' },
  { label: 'Small', value: '14px' },
  { label: 'Normal', value: '' },
  { label: 'Medium', value: '18px' },
  { label: 'Large', value: '22px' },
  { label: 'Very large', value: '28px' },
  { label: 'Huge', value: '36px' },
];

export const TEXT_COLORS: { label: string; value: string }[] = [
  { label: 'Default', value: '' },
  { label: 'Brand blue', value: '#1552F0' },
  { label: 'Dark', value: '#0B1220' },
  { label: 'Grey', value: '#64748B' },
  { label: 'Red', value: '#DC2626' },
  { label: 'Amber', value: '#B45309' },
  { label: 'Green', value: '#15803D' },
  { label: 'Purple', value: '#7C3AED' },
];

export const HIGHLIGHT_COLORS: { label: string; value: string }[] = [
  { label: 'Yellow', value: '#FEF08A' },
  { label: 'Green', value: '#BBF7D0' },
  { label: 'Blue', value: '#BFDBFE' },
  { label: 'Pink', value: '#FBCFE8' },
  { label: 'Orange', value: '#FED7AA' },
];
