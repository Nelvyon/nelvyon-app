"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import { useCallback } from "react";

interface EmailEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const TOOLBAR_BTN =
  "rounded px-2 py-1 text-xs font-medium transition-colors hover:bg-muted/60 disabled:opacity-40";
const ACTIVE = "bg-primary/20 text-primary";

export function EmailEditor({ value, onChange, placeholder = "Escribe el contenido del email…" }: EmailEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
    ],
    content: value || `<p>${placeholder}</p>`,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[280px] px-4 py-3 text-sm text-foreground focus:outline-none prose prose-invert prose-sm max-w-none",
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del enlace:", prev ?? "https://");
    if (url === null) return;
    if (url === "") { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const btn = (active: boolean, onClick: () => void, label: string, title?: string) => (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      className={`${TOOLBAR_BTN} ${active ? ACTIVE : "text-muted-foreground"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/20 px-3 py-2">
        {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "B", "Negrita")}
        {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "I", "Cursiva")}
        {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), "U", "Subrayado")}
        <span className="mx-1 text-border">|</span>
        {btn(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), "H1")}
        {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2")}
        {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "H3")}
        <span className="mx-1 text-border">|</span>
        {btn(editor.isActive({ textAlign: "left" }), () => editor.chain().focus().setTextAlign("left").run(), "⬅", "Alinear izq")}
        {btn(editor.isActive({ textAlign: "center" }), () => editor.chain().focus().setTextAlign("center").run(), "↔", "Centrar")}
        {btn(editor.isActive({ textAlign: "right" }), () => editor.chain().focus().setTextAlign("right").run(), "➡", "Alinear der")}
        <span className="mx-1 text-border">|</span>
        {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "• Lista")}
        {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "1. Lista")}
        <span className="mx-1 text-border">|</span>
        {btn(editor.isActive("link"), setLink, "🔗 Enlace")}
        {btn(false, () => editor.chain().focus().undo().run(), "↩", "Deshacer")}
        {btn(false, () => editor.chain().focus().redo().run(), "↪", "Rehacer")}
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Variables hint */}
      <div className="border-t border-border bg-muted/10 px-4 py-2">
        <p className="text-xs text-muted-foreground">
          Variables disponibles:{" "}
          {["{{nombre}}", "{{empresa}}", "{{email}}", "{{plan}}"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => editor.chain().focus().insertContent(v).run()}
              className="mx-0.5 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-primary hover:bg-primary/20"
            >
              {v}
            </button>
          ))}
        </p>
      </div>
    </div>
  );
}
