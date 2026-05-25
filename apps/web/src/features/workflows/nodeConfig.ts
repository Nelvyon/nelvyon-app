import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  CircleStop,
  GitBranch,
  Link,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Send,
  Tag,
  Timer,
  UserPlus,
  Webhook,
  Zap,
} from "lucide-react";

export type NodeDef = {
  nodeType: string;
  category: "trigger" | "action" | "logic" | "end";
  label: string;
  icon: LucideIcon;
  color: string;
  fields: Array<{ key: string; label: string; type: "text" | "number" | "select" | "textarea"; options?: string[] }>;
};

export const NODE_PALETTE: Record<string, NodeDef[]> = {
  Triggers: [
    {
      nodeType: "form_submit",
      category: "trigger",
      label: "Form Submit",
      icon: Send,
      color: "#6366f1",
      fields: [{ key: "form_id", label: "Form ID (opcional)", type: "text" }],
    },
    {
      nodeType: "email_open",
      category: "trigger",
      label: "Email Open",
      icon: Mail,
      color: "#6366f1",
      fields: [{ key: "campaign_id", label: "Campaign ID (opcional)", type: "text" }],
    },
    {
      nodeType: "link_click",
      category: "trigger",
      label: "Link Click",
      icon: Link,
      color: "#6366f1",
      fields: [{ key: "campaign_id", label: "Campaign ID (opcional)", type: "text" }],
    },
    {
      nodeType: "contact_created",
      category: "trigger",
      label: "Contact Created",
      icon: UserPlus,
      color: "#6366f1",
      fields: [],
    },
    {
      nodeType: "date",
      category: "trigger",
      label: "Scheduled Date",
      icon: Calendar,
      color: "#6366f1",
      fields: [{ key: "cron", label: "Cron / ISO date", type: "text" }],
    },
    {
      nodeType: "webhook",
      category: "trigger",
      label: "Webhook In",
      icon: Webhook,
      color: "#6366f1",
      fields: [{ key: "secret", label: "Secret token", type: "text" }],
    },
  ],
  Actions: [
    {
      nodeType: "send_email",
      category: "action",
      label: "Send Email",
      icon: Mail,
      color: "#0ea5e9",
      fields: [
        { key: "to_email", label: "To email", type: "text" },
        { key: "subject", label: "Subject", type: "text" },
        { key: "body_html", label: "Body HTML", type: "textarea" },
      ],
    },
    {
      nodeType: "send_sms",
      category: "action",
      label: "Send SMS",
      icon: MessageSquare,
      color: "#0ea5e9",
      fields: [
        { key: "phone", label: "Phone", type: "text" },
        { key: "message", label: "Message", type: "textarea" },
      ],
    },
    {
      nodeType: "send_whatsapp",
      category: "action",
      label: "WhatsApp",
      icon: Phone,
      color: "#0ea5e9",
      fields: [
        { key: "phone", label: "Phone", type: "text" },
        { key: "message", label: "Message", type: "textarea" },
      ],
    },
    {
      nodeType: "add_tag",
      category: "action",
      label: "Add Tag",
      icon: Tag,
      color: "#0ea5e9",
      fields: [
        { key: "tag", label: "Tag", type: "text" },
        { key: "contact_id", label: "Contact ID", type: "text" },
      ],
    },
    {
      nodeType: "remove_tag",
      category: "action",
      label: "Remove Tag",
      icon: Tag,
      color: "#0ea5e9",
      fields: [
        { key: "tag", label: "Tag", type: "text" },
        { key: "contact_id", label: "Contact ID", type: "text" },
      ],
    },
    {
      nodeType: "update_crm",
      category: "action",
      label: "Update CRM",
      icon: UserPlus,
      color: "#0ea5e9",
      fields: [
        { key: "contact_id", label: "Contact ID", type: "text" },
        { key: "status", label: "Status", type: "text" },
      ],
    },
    {
      nodeType: "create_task",
      category: "action",
      label: "Create Task",
      icon: Plus,
      color: "#0ea5e9",
      fields: [
        { key: "contact_id", label: "Contact ID", type: "text" },
        { key: "title", label: "Title", type: "text" },
        { key: "description", label: "Description", type: "textarea" },
      ],
    },
    {
      nodeType: "notify_slack",
      category: "action",
      label: "Notify Slack",
      icon: Zap,
      color: "#0ea5e9",
      fields: [
        { key: "webhook_url", label: "Slack webhook URL", type: "text" },
        { key: "message", label: "Message", type: "textarea" },
      ],
    },
    {
      nodeType: "webhook_out",
      category: "action",
      label: "Webhook Out",
      icon: Webhook,
      color: "#0ea5e9",
      fields: [{ key: "url", label: "URL", type: "text" }],
    },
  ],
  Logic: [
    {
      nodeType: "if_condition",
      category: "logic",
      label: "If / Else",
      icon: GitBranch,
      color: "#f59e0b",
      fields: [
        {
          key: "field",
          label: "Field",
          type: "select",
          options: ["score", "email", "tags", "status"],
        },
        {
          key: "operator",
          label: "Operator",
          type: "select",
          options: ["eq", "neq", "gt", "gte", "lt", "lte", "contains", "in"],
        },
        { key: "value", label: "Value", type: "text" },
      ],
    },
    {
      nodeType: "split_ab",
      category: "logic",
      label: "A/B Split",
      icon: GitBranch,
      color: "#f59e0b",
      fields: [{ key: "variants", label: "Variants (comma)", type: "text" }],
    },
    {
      nodeType: "wait_delay",
      category: "logic",
      label: "Wait / Delay",
      icon: Timer,
      color: "#f59e0b",
      fields: [{ key: "delay_seconds", label: "Delay (seconds)", type: "number" }],
    },
    {
      nodeType: "end",
      category: "end",
      label: "End",
      icon: CircleStop,
      color: "#64748b",
      fields: [],
    },
  ],
};

export function findNodeDef(nodeType: string): NodeDef | undefined {
  for (const group of Object.values(NODE_PALETTE)) {
    const found = group.find((n) => n.nodeType === nodeType);
    if (found) return found;
  }
  return undefined;
}
