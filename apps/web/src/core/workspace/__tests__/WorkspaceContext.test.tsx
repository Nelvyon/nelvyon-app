import React, { useEffect, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, it, vi } from "vitest";

import { AuthProvider, useAuth } from "@/core/auth/AuthContext";
import { WorkspaceProvider } from "@/core/workspace/WorkspaceContext";
import { WorkspaceSelector } from "@/core/workspace/WorkspaceSelector";
import { useWorkspaceList } from "@/features/workspace/hooks";

vi.mock("@/features/workspace/hooks", () => ({
  useWorkspaceList: vi.fn(),
  useCreateWorkspace: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
    mutate: vi.fn(),
  }),
}));

function SessionBoot({ children }: { children: React.ReactNode }) {
  const { signIn } = useAuth();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    signIn({ id: "user-1", email: "t@example.com", role: "operator" }, "test-token");
    setReady(true);
  }, [signIn]);
  if (!ready) return null;
  return <>{children}</>;
}

describe("WorkspaceContext", () => {
  beforeEach(() => {
    vi.mocked(useWorkspaceList).mockReturnValue({
      data: [
        { id: 1, name: "Alpha", role: "owner", members_count: 1 },
        { id: 2, name: "Beta", role: "member", members_count: 2 },
      ],
      isLoading: false,
      isSuccess: true,
      error: null,
    } as ReturnType<typeof useWorkspaceList>);
  });

  it("updates selected workspace id", async () => {
    render(
      <AuthProvider>
        <SessionBoot>
          <WorkspaceProvider>
            <WorkspaceSelector />
          </WorkspaceProvider>
        </SessionBoot>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("workspace-selector")).toBeInTheDocument();
    });

    const select = screen.getByLabelText("workspace-selector") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "2" } });
    expect(select.value).toBe("2");
  });
});
