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

/**
 * El cromo del editor usa clases de Bootstrap 5 (las que trae la plantilla
 * W3CRM) para que encaje dentro del hueco `custom-ekeditor ct-ticket` que la
 * pantalla `(cms)/add-email` reserva para su CKEditor. La logica de TipTap
 * —extensiones, `setLink`, variables, `value`/`onChange`— no cambia.
 */
const TOOLBAR_BTN = "btn btn-sm";
const ACTIVE = "btn-primary";
const INACTIVE = "btn-primary light";

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
        class: "px-3 py-3 fs-14 email-editor-body",
        style: "min-height:280px;outline:none;",
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
      aria-pressed={active}
      className={`${TOOLBAR_BTN} ${active ? ACTIVE : INACTIVE}`}
    >
      {label}
    </button>
  );

  return (
    <div className="border rounded overflow-hidden">
      {/* Toolbar */}
      <div className="d-flex flex-wrap align-items-center gap-1 border-bottom p-2">
        {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "B", "Negrita")}
        {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "I", "Cursiva")}
        {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), "U", "Subrayado")}
        <span className="mx-1 text-muted">|</span>
        {btn(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), "H1")}
        {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2")}
        {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "H3")}
        <span className="mx-1 text-muted">|</span>
        {btn(editor.isActive({ textAlign: "left" }), () => editor.chain().focus().setTextAlign("left").run(), "⬅", "Alinear izq")}
        {btn(editor.isActive({ textAlign: "center" }), () => editor.chain().focus().setTextAlign("center").run(), "↔", "Centrar")}
        {btn(editor.isActive({ textAlign: "right" }), () => editor.chain().focus().setTextAlign("right").run(), "➡", "Alinear der")}
        <span className="mx-1 text-muted">|</span>
        {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "• Lista")}
        {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "1. Lista")}
        <span className="mx-1 text-muted">|</span>
        {btn(editor.isActive("link"), setLink, "🔗 Enlace")}
        {btn(false, () => editor.chain().focus().undo().run(), "↩", "Deshacer")}
        {btn(false, () => editor.chain().focus().redo().run(), "↪", "Rehacer")}
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Variables hint */}
      <div className="border-top p-2">
        <p className="mb-0 fs-12 text-muted">
          Variables disponibles:{" "}
          {["{{nombre}}", "{{empresa}}", "{{email}}", "{{plan}}"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => editor.chain().focus().insertContent(v).run()}
              className="btn btn-primary light btn-xs me-1"
            >
              {v}
            </button>
          ))}
        </p>
      </div>
    </div>
  );
}
