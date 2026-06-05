import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DealsKanban } from "../components/DealsKanban";
import type { SaasDeal } from "../types";

const deal = (overrides: Partial<SaasDeal> = {}): SaasDeal => ({
  id: "d1",
  tenantId: "t1",
  contactId: "c1",
  title: "Acme renewal",
  value: 5000,
  currency: "EUR",
  stage: "new",
  probability: 10,
  expectedCloseDate: null,
  source: null,
  ownerUserId: null,
  notes: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

const contactsById = new Map([["c1", { name: "Jane Doe", company: "Acme" }]]);

function mockDataTransfer() {
  return {
    effectAllowed: "",
    dropEffect: "",
    setData: vi.fn(),
    getData: vi.fn(),
  };
}

function renderKanban(props: Partial<React.ComponentProps<typeof DealsKanban>> = {}) {
  const onMoveStage = vi.fn();
  const onSelectDeal = vi.fn();
  render(
    <DealsKanban
      deals={[deal()]}
      contactsById={contactsById}
      onMoveStage={onMoveStage}
      onSelectDeal={onSelectDeal}
      {...props}
    />,
  );
  return { onMoveStage, onSelectDeal };
}

describe("DealsKanban", () => {
  it("moves deal via drag-and-drop to another column", () => {
    const { onMoveStage } = renderKanban();
    const card = screen.getByTestId("kanban-deal-d1");
    const targetColumn = screen.getByTestId("kanban-column-contacted");
    const dataTransfer = mockDataTransfer();

    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.dragOver(targetColumn, { dataTransfer });
    fireEvent.drop(targetColumn, { dataTransfer });

    expect(onMoveStage).toHaveBeenCalledTimes(1);
    expect(onMoveStage).toHaveBeenCalledWith(expect.objectContaining({ id: "d1", stage: "new" }), "contacted");
  });

  it("does not call onMoveStage when dropped on same column", () => {
    const { onMoveStage } = renderKanban();
    const card = screen.getByTestId("kanban-deal-d1");
    const column = screen.getByTestId("kanban-column-new");
    const dataTransfer = mockDataTransfer();

    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.drop(column, { dataTransfer });

    expect(onMoveStage).not.toHaveBeenCalled();
  });

  it("moves deal via stage buttons as fallback", () => {
    const { onMoveStage } = renderKanban();
    const nextButton = screen.getByRole("button", { name: /mover acme renewal a etapa siguiente/i });

    fireEvent.click(nextButton);

    expect(onMoveStage).toHaveBeenCalledTimes(1);
    expect(onMoveStage).toHaveBeenCalledWith(expect.objectContaining({ id: "d1" }), "contacted");
  });

  it("selects deal on click but not immediately after drag", () => {
    const { onSelectDeal } = renderKanban();
    const card = screen.getByTestId("kanban-deal-d1");
    const targetColumn = screen.getByTestId("kanban-column-contacted");

    fireEvent.click(card);
    expect(onSelectDeal).toHaveBeenCalledTimes(1);

    onSelectDeal.mockClear();
    const dataTransfer = mockDataTransfer();
    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.drop(targetColumn, { dataTransfer });
    fireEvent.click(card);
    expect(onSelectDeal).not.toHaveBeenCalled();
  });

  it("disables stage buttons while deal is changing", () => {
    renderKanban({ changingDealId: "d1" });
    expect(screen.getByRole("button", { name: /mover acme renewal a etapa siguiente/i })).toBeDisabled();
    expect(screen.getByText(/moviendo/i)).toBeInTheDocument();
  });
});
