import ImageBase from "@tiptap/extension-image";
import { ReactNodeViewRenderer } from "@tiptap/react";
import ImageNodeView from "./ImageNode";

const ImageExtension = ImageBase.extend({
  // Default allowBase64 to true so the parent's stripping plugin never runs,
  // regardless of whether .configure({ allowBase64: true }) is called at the use-site.
  addOptions() {
    return {
      ...this.parent?.(),
      allowBase64: true,
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute("width"),
        renderHTML: (attrs) => (attrs.width ? { width: attrs.width } : {}),
      },
    };
  },

  // Explicitly prevent the parent's plugin that strips base64 src values.
  // addOptions already defaults allowBase64: true, but this is the hard guarantee.
  addProseMirrorPlugins() {
    return [];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

export default ImageExtension;
