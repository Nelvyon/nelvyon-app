import React from "react";
import { render, screen } from "@testing-library/react";

import { ClientForm } from "@/features/crm/components/ClientForm";

describe("ClientForm", () => {
  it("disables submit when role cannot create/edit", () => {
    render(
      <ClientForm
        canSubmit={false}
        onSubmit={async () => {
          return;
        }}
      />,
    );

    expect(screen.getByRole("button", { name: /guardar cliente/i })).toBeDisabled();
    expect(screen.getByText(/no tienes permiso/i)).toBeInTheDocument();
  });
});
