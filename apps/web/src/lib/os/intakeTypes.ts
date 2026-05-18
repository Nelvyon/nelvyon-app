export type IntakeFieldType =
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "color"
  | "url"
  | "number"
  | "boolean";

export interface IntakeField {
  name: string;
  label: string;
  type: IntakeFieldType;
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  minItems?: number;
  maxItems?: number;
}
