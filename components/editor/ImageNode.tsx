"use client";

import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_WIDTH = 48;

type Handle = "right" | "bottom-right" | "bottom";

export default function ImageNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [hovered, setHovered] = useState(false);

  // Only use an explicit pixel width when the user has manually resized.
  // Without it the image defaults to max-width:100% via CSS and never overflows.
  const width: number | null = node.attrs.width ? Number(node.attrs.width) : null;

  // --- Resize drag state ---
  const dragRef = useRef<{
    handle: Handle;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    aspectRatio: number;
  } | null>(null);

  const startResize = useCallback(
    (e: React.MouseEvent, handle: Handle) => {
      e.preventDefault();
      e.stopPropagation();
      const img = imgRef.current;
      if (!img) return;
      const rect = img.getBoundingClientRect();
      // Use naturalWidth/naturalHeight for a precise aspect ratio regardless
      // of how the image is currently displayed.
      const aspectRatio =
        img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : rect.width / rect.height;
      dragRef.current = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startW: rect.width,
        startH: rect.height,
        aspectRatio,
      };
    },
    []
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d || !imgRef.current) return;

      let newW = d.startW;

      if (d.handle === "right" || d.handle === "bottom-right") {
        newW = Math.max(MIN_WIDTH, d.startW + (e.clientX - d.startX));
      } else if (d.handle === "bottom") {
        const newH = Math.max(MIN_WIDTH, d.startH + (e.clientY - d.startY));
        newW = Math.round(newH * d.aspectRatio);
      }

      // Live preview via direct DOM style (no re-render until mouseup)
      imgRef.current.style.width = `${Math.round(newW)}px`;
    };

    const onUp = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d || !imgRef.current) return;

      let finalW = d.startW;
      if (d.handle === "right" || d.handle === "bottom-right") {
        finalW = Math.max(MIN_WIDTH, d.startW + (e.clientX - d.startX));
      } else if (d.handle === "bottom") {
        const newH = Math.max(MIN_WIDTH, d.startH + (e.clientY - d.startY));
        finalW = Math.round(newH * d.aspectRatio);
      }

      // Persist rounded value to ProseMirror node attrs
      updateAttributes({ width: Math.round(finalW) });
      dragRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [updateAttributes]);

  const showControls = hovered || selected;

  return (
    <NodeViewWrapper
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: width ? `${width}px` : undefined }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt ?? ""}
        title={node.attrs.title ?? undefined}
        draggable={false}
        style={{ width: width ? `${width}px` : undefined, display: "block" }}
        className={`max-w-full rounded select-none ${
          selected ? "ring-2 ring-blue-500" : ""
        }`}
      />

      {/* Delete button */}
      {showControls && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteNode();
          }}
          className="absolute top-1.5 right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-gray-800/70 text-white hover:bg-red-600 transition-colors text-xs leading-none z-10"
          title="Remove image"
          aria-label="Remove image"
        >
          ✕
        </button>
      )}

      {/* Resize handles */}
      {showControls && (
        <>
          {/* Right edge */}
          <span
            onMouseDown={(e) => startResize(e, "right")}
            className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-8 rounded-full bg-blue-500/80 cursor-ew-resize z-10"
            title="Resize width"
          />
          {/* Bottom edge */}
          <span
            onMouseDown={(e) => startResize(e, "bottom")}
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-8 rounded-full bg-blue-500/80 cursor-ns-resize z-10"
            title="Resize height"
          />
          {/* Bottom-right corner */}
          <span
            onMouseDown={(e) => startResize(e, "bottom-right")}
            className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-blue-500 cursor-nwse-resize z-10"
            title="Resize"
          />
        </>
      )}
    </NodeViewWrapper>
  );
}
