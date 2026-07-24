import { beforeEach, describe, expect, it } from "vitest";
import {
  SimulatorPublishProvider,
  addToContentInbox,
  assertCommunityPublishCoreIntegrity,
  assertPublishDisabled,
  buildEditorialCalendar,
  buildMetricsPlaceholders,
  buildNetworkVariants,
  classifyModerationEvent,
  decideContentInboxItem,
  enqueuePublishItem,
  evaluateApprovalWorkflow,
  listAuditLog,
  listContentInbox,
  listModerationLog,
  listPublishQueue,
  resetCommunityPublishStateForTests,
  COMMUNITY_PUBLISH_ROLLBACK_PLAN,
} from "../CommunityPublishCore";

describe("CommunityPublishCore", () => {
  beforeEach(() => {
    resetCommunityPublishStateForTests();
  });

  it("content inbox add/list/decide + audit trail", () => {
    const item = addToContentInbox({
      source: "manual_draft",
      title: "Post lanzamiento",
      body: "Contenido de prueba",
      platforms: ["instagram", "linkedin"],
    });
    expect(item.status).toBe("pending_review");
    expect(listContentInbox()).toHaveLength(1);
    const decided = decideContentInboxItem(item.id, "approved", "cs_ops");
    expect(decided?.status).toBe("approved");
    expect(listAuditLog().some((a) => a.action === "content_inbox_decision")).toBe(true);
  });

  it("builds editorial calendar entries across platforms", () => {
    const entries = buildEditorialCalendar("content-1", ["instagram", "tiktok", "linkedin"], new Date());
    expect(entries).toHaveLength(3);
    expect(entries.every((e) => e.status === "planned")).toBe(true);
  });

  it("evaluateApprovalWorkflow requires CEO always, client only when required", () => {
    expect(evaluateApprovalWorkflow({ requiresClientApproval: false, clientApproved: false, ceoApproved: false }).ok).toBe(
      false,
    );
    expect(evaluateApprovalWorkflow({ requiresClientApproval: false, clientApproved: false, ceoApproved: true }).ok).toBe(
      true,
    );
    expect(evaluateApprovalWorkflow({ requiresClientApproval: true, clientApproved: false, ceoApproved: true }).ok).toBe(
      false,
    );
    expect(evaluateApprovalWorkflow({ requiresClientApproval: true, clientApproved: true, ceoApproved: true }).ok).toBe(
      true,
    );
  });

  it("builds per-network variants respecting platform constraints", () => {
    const variants = buildNetworkVariants({
      title: "Lanzamiento",
      body: "Descripción larga del post",
      sector: "ecommerce",
      platforms: ["x", "instagram"],
    });
    const xVariant = variants.find((v) => v.platform === "x")!;
    expect(xVariant.caption.length).toBeLessThanOrEqual(280);
    expect(xVariant.hashtags.length).toBeLessThanOrEqual(2);
  });

  it("assertPublishDisabled is disabled by default and requires BOTH oauth and CEO", () => {
    expect(assertPublishDisabled().disabled).toBe(true);
    expect(assertPublishDisabled({ oauthConnected: true }).disabled).toBe(true);
    expect(assertPublishDisabled({ ceoApproved: true }).disabled).toBe(true);
    expect(assertPublishDisabled({ oauthConnected: true, ceoApproved: true }).disabled).toBe(false);
  });

  it("enqueuePublishItem is blocked by default and only reaches the simulator with oauth+ceo", () => {
    const blocked = enqueuePublishItem({ contentId: "c1", platform: "instagram", caption: "hola" });
    expect(blocked.status).toBe("blocked_publish_disabled");
    expect(blocked.simulatedAt).toBeNull();

    const simulated = enqueuePublishItem({
      contentId: "c1",
      platform: "instagram",
      caption: "hola",
      oauthConnected: true,
      ceoApproved: true,
    });
    expect(simulated.status).toBe("published_simulated");
    expect(simulated.providerId).toBe("simulator");
    expect(listPublishQueue()).toHaveLength(2);
  });

  it("SimulatorPublishProvider never performs a real network call — only returns a simulated record", () => {
    const provider = new SimulatorPublishProvider();
    const result = provider.publish({ contentId: "c1", platform: "tiktok", caption: "hola" });
    expect(result.ok).toBe(true);
    expect(result.simulated).toBe(true);
    expect(result.providerId).toBe("simulator");
  });

  it("moderation escalates complaints/legal-sensitive to a human, logs everything else", () => {
    const complaint = classifyModerationEvent({
      contentId: "c1",
      category: "queja_legal_sensible",
      commentPreview: "voy a poner una denuncia",
    });
    expect(complaint.escalatedToHuman).toBe(true);

    const praise = classifyModerationEvent({ contentId: "c1", category: "elogio", commentPreview: "genial!" });
    expect(praise.escalatedToHuman).toBe(false);
    expect(listModerationLog()).toHaveLength(2);
  });

  it("metrics placeholders are always null until real publish is authorized", () => {
    const placeholders = buildMetricsPlaceholders(["instagram", "linkedin"]);
    expect(placeholders.every((p) => p.reach === null && p.engagement === null)).toBe(true);
  });

  it("rollback plan is non-empty and keeps flags OFF", () => {
    expect(COMMUNITY_PUBLISH_ROLLBACK_PLAN.length).toBeGreaterThan(0);
    expect(COMMUNITY_PUBLISH_ROLLBACK_PLAN.some((s) => s.includes("SimulatorPublishProvider"))).toBe(true);
  });

  it("assertCommunityPublishCoreIntegrity passes with no violations and leaves no residue", () => {
    const result = assertCommunityPublishCoreIntegrity();
    expect(result.violations).toEqual([]);
    expect(result.ok).toBe(true);
    expect(listPublishQueue()).toHaveLength(0);
    expect(listAuditLog()).toHaveLength(0);
  });
});
