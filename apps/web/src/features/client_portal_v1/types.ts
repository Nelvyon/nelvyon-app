export interface SignupFormValues {
  email: string;
  fullName: string;
  password: string;
}

export interface WorkspaceOption {
  id: string;
  name: string;
  role: "owner" | "member";
}

export interface SimpleProjectInput {
  name: string;
  goal: string;
  primaryChannel: string;
}

export interface SimpleProjectDraft {
  id: string;
  name: string;
  goal: string;
  primaryChannel: string;
  status: "draft" | "active";
  createdAt: string;
}
