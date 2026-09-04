import { describe, it, expect, vi, beforeEach } from "vitest";
import { SaasSequencesService, resetSaasSequencesServiceForTests } from "../SaasSequencesService";

// ── DB mock factory ──────────────────────────────────────────────────────────

function makeDb() {
  const query = vi.fn();
  return { query };
}

/**
 * Doble de base que responde por FORMA de consulta, no por orden de llamada.
 *
 * Los encadenados `mockResolvedValueOnce` de antes ataban cada prueba al número
 * exacto de consultas que hacía el servicio. Al añadir el cierre por
 * consentimiento retirado, siete pruebas se pusieron rojas sin que ninguna de
 * las propiedades que comprobaban hubiera dejado de cumplirse: sólo se habían
 * desplazado los índices.
 *
 * Responder por forma comprueba MÁS, no menos: un servicio que hiciera las
 * consultas correctas en el orden equivocado pasaba el encadenado, y aquí no.
 */
function responderPorForma(reglas: Array<[RegExp, unknown]>) {
  return (sql: string) => {
    for (const [patron, valor] of reglas) if (patron.test(sql.replace(/\s+/g, " "))) return valor;
    return [];
  };
}

/** Ninguna baja pendiente: el cierre por consentimiento no debe tocar nada. */
const SIN_BAJAS: [RegExp, unknown] = [/FROM saas_contacts c/, []];

const SEQ = {
  id: "seq-1", tenant_id: "t1", name: "Onboarding", description: null,
  trigger_type: "manual" as const, trigger_config: {}, status: "active" as const,
  enrollments_count: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

const STEP_EMAIL = {
  id: "step-1", sequence_id: "seq-1", position: 0, step_type: "email" as const,
  delay_days: 0, delay_hours: 0, subject: "Bienvenido", body_html: "<p>Hola</p>",
  branch_condition: null, branch_yes_position: null, branch_no_position: null,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

const STEP_WAIT = {
  ...STEP_EMAIL, id: "step-2", position: 1, step_type: "wait" as const,
  subject: "", body_html: "", delay_days: 1,
};

const STEP_BRANCH = {
  ...STEP_EMAIL, id: "step-3", position: 2, step_type: "branch" as const,
  subject: "", body_html: "",
  branch_condition: { field: "replied" as const, op: "eq" as const, value: true },
  branch_yes_position: 3, branch_no_position: 4,
};

// ── updateStep ──────────────────────────────────────────────────────────────

describe("SaasSequencesService.updateStep", () => {
  let db: ReturnType<typeof makeDb>;
  let svc: SaasSequencesService;

  beforeEach(() => {
    resetSaasSequencesServiceForTests();
    db = makeDb();
    svc = new SaasSequencesService(db as never);
  });

  it("updates step_type and subject", async () => {
    db.query
      .mockResolvedValueOnce([SEQ])              // get sequence
      .mockResolvedValueOnce([{ ...STEP_EMAIL, step_type: "wait", subject: "" }]); // UPDATE RETURNING

    const result = await svc.updateStep("t1", "seq-1", "step-1", { stepType: "wait" });
    expect(result.stepType).toBe("wait");
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  it("updates branchCondition and positions", async () => {
    const updatedStep = {
      ...STEP_EMAIL, step_type: "branch" as const,
      branch_condition: { field: "replied", op: "eq", value: true },
      branch_yes_position: 3, branch_no_position: 4,
    };
    db.query
      .mockResolvedValueOnce([SEQ])
      .mockResolvedValueOnce([updatedStep]);

    const result = await svc.updateStep("t1", "seq-1", "step-1", {
      stepType: "branch",
      branchCondition: { field: "replied", op: "eq", value: true },
      branchYesPosition: 3, branchNoPosition: 4,
    });
    expect(result.stepType).toBe("branch");
    expect(result.branchCondition?.field).toBe("replied");
    expect(result.branchYesPosition).toBe(3);
  });

  it("throws NOT_FOUND when sequence not found", async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(svc.updateStep("t1", "bad-id", "step-1", { delayDays: 1 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND when step not found", async () => {
    db.query.mockResolvedValueOnce([SEQ]).mockResolvedValueOnce([]);
    await expect(svc.updateStep("t1", "seq-1", "bad-step", { delayDays: 1 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws VALIDATION for empty update", async () => {
    db.query.mockResolvedValueOnce([SEQ]);
    await expect(svc.updateStep("t1", "seq-1", "step-1", {})).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws VALIDATION for invalid stepType", async () => {
    db.query.mockResolvedValueOnce([SEQ]);
    await expect(svc.updateStep("t1", "seq-1", "step-1", { stepType: "invalid" as never })).rejects.toMatchObject({ code: "VALIDATION" });
  });
});

// ── handleReplyHook ─────────────────────────────────────────────────────────

describe("SaasSequencesService.handleReplyHook", () => {
  let db: ReturnType<typeof makeDb>;
  let svc: SaasSequencesService;

  const ENR = {
    id: "enr-1", sequence_id: "seq-1", tenant_id: "t1", contact_id: "c1",
    current_step: 2, status: "active", reply_received: true,
    next_send_at: null, enrolled_at: new Date().toISOString(), completed_at: null,
  };

  /** Una respuesta humana cualquiera. El texto decide, así que hay que darlo. */
  const RESPUESTA_HUMANA = "Hola, cuéntame más";

  beforeEach(() => {
    resetSaasSequencesServiceForTests();
    db = makeDb();
    svc = new SaasSequencesService(db as never);
  });

  it("marks the enrollment as replied", async () => {
    db.query.mockImplementation(
      responderPorForma([
        [/SET reply_received/, [ENR]],
        [/COUNT\(\*\).*branch_condition/, [{ n: "1" }]],
        [/FROM saas_sequence_steps/, [STEP_BRANCH]],
      ]) as never,
    );

    await svc.handleReplyHook("t1", "seq-1", "c1", RESPUESTA_HUMANA);

    const marca = db.query.mock.calls.find((c) => /SET reply_received/.test(c[0] as string));
    expect(marca, "no se marcó la respuesta").toBeDefined();
    // Ahora es un parámetro y no un literal: un autorespondedor pasa `false`.
    expect(marca![1]).toContain(true);
  });

  it("advances enrollment to branch_yes_position when on branch step", async () => {
    db.query.mockImplementation(
      responderPorForma([
        [/SET reply_received/, [ENR]],
        [/COUNT\(\*\).*branch_condition/, [{ n: "1" }]],
        [/FROM saas_sequence_steps/, [STEP_BRANCH]],
      ]) as never,
    );

    await svc.handleReplyHook("t1", "seq-1", "c1", RESPUESTA_HUMANA);

    const avance = db.query.mock.calls.find((c) => /SET current_step/.test(c[0] as string));
    expect(avance, "no avanzó por la rama").toBeDefined();
    expect(avance![1]).toContain(3); // branch_yes_position
  });

  it("does nothing when enrollment not found", async () => {
    db.query.mockResolvedValue([]);
    await svc.handleReplyHook("t1", "seq-1", "c-missing", RESPUESTA_HUMANA);
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it("sin rama sobre `replied`, una respuesta humana DETIENE la secuencia", async () => {
    // Cambio deliberado: antes no hacía nada, y el prospecto seguía recibiendo
    // los correos restantes después de haber contestado.
    db.query.mockImplementation(
      responderPorForma([
        [/SET reply_received/, [ENR]],
        [/COUNT\(\*\).*branch_condition/, [{ n: "0" }]],
      ]) as never,
    );

    await svc.handleReplyHook("t1", "seq-1", "c1", RESPUESTA_HUMANA);

    const cierre = db.query.mock.calls.find((c) => /status='completed'/.test(c[0] as string));
    expect(cierre, "se siguió escribiendo a quien ya había contestado").toBeDefined();
    const avance = db.query.mock.calls.find((c) => /SET current_step/.test(c[0] as string));
    expect(avance, "avanzó de paso sin haber rama que lo pidiera").toBeUndefined();
  });
});

// ── addStep with branch/wait types ──────────────────────────────────────────

describe("SaasSequencesService.addStep — v2 types", () => {
  let db: ReturnType<typeof makeDb>;
  let svc: SaasSequencesService;

  beforeEach(() => {
    resetSaasSequencesServiceForTests();
    db = makeDb();
    svc = new SaasSequencesService(db as never);
  });

  it("adds wait step without requiring subject/bodyHtml", async () => {
    db.query
      .mockResolvedValueOnce([SEQ])
      .mockResolvedValueOnce([{ max_pos: 0 }])
      .mockResolvedValueOnce([STEP_WAIT]);

    const step = await svc.addStep("t1", "seq-1", { stepType: "wait", delayDays: 1 });
    expect(step.stepType).toBe("wait");
  });

  it("adds branch step with condition", async () => {
    db.query
      .mockResolvedValueOnce([SEQ])
      .mockResolvedValueOnce([{ max_pos: 1 }])
      .mockResolvedValueOnce([STEP_BRANCH]);

    const step = await svc.addStep("t1", "seq-1", {
      stepType: "branch",
      branchCondition: { field: "replied", op: "eq", value: true },
      branchYesPosition: 3, branchNoPosition: 4,
    });
    expect(step.stepType).toBe("branch");
    expect(step.branchCondition?.field).toBe("replied");
  });

  it("throws VALIDATION when email step missing subject", async () => {
    db.query.mockResolvedValueOnce([SEQ]);
    await expect(svc.addStep("t1", "seq-1", { stepType: "email", bodyHtml: "<p>ok</p>" })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws VALIDATION when email step missing bodyHtml", async () => {
    db.query.mockResolvedValueOnce([SEQ]);
    await expect(svc.addStep("t1", "seq-1", { stepType: "email", subject: "Hi" })).rejects.toMatchObject({ code: "VALIDATION" });
  });
});

// ── processDueEnrollments — branching ───────────────────────────────────────

describe("SaasSequencesService.processDueEnrollments — branch/wait logic", () => {
  let db: ReturnType<typeof makeDb>;
  let svc: SaasSequencesService;
  const sendEmail = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    resetSaasSequencesServiceForTests();
    process.env.TRACKING_SECRET = "test-tracking-secret-32chars-long!!";
    db = makeDb();
    svc = new SaasSequencesService(db as never);
    sendEmail.mockClear();
  });

  /** Inscripción pendiente + el paso que le toca + el siguiente. */
  function conPendiente(enrollment: unknown, paso: unknown, siguiente: unknown[]) {
    db.query.mockImplementation(
      responderPorForma([
        SIN_BAJAS,
        [/next_send_at <= NOW\(\)/, [enrollment]],
        [/JOIN saas_contacts/, [paso]],
        [/position >= \$2/, siguiente],
      ]) as never,
    );
  }

  const avance = () => db.query.mock.calls.find((c) => /SET current_step/.test(c[0] as string));

  it("processes branch step without sending email", async () => {
    conPendiente(
      { id: "enr-1", sequence_id: "seq-1", tenant_id: "t1", contact_id: "c1",
        current_step: 2, reply_received: true, email_opened: false, email_clicked: false },
      { ...STEP_BRANCH, contact_email: "test@test.com", contact_name: "Test" },
      [{ position: 3, delay_days: 0, delay_hours: 0 }],
    );

    await svc.processDueEnrollments(sendEmail);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("processes wait step without sending email", async () => {
    conPendiente(
      { id: "enr-1", sequence_id: "seq-1", tenant_id: "t1", contact_id: "c1",
        current_step: 1, reply_received: false, email_opened: false, email_clicked: false },
      { ...STEP_WAIT, contact_email: "test@test.com", contact_name: "Test" },
      [{ position: 2, delay_days: 0, delay_hours: 0 }],
    );

    await svc.processDueEnrollments(sendEmail);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends email for email steps and advances enrollment", async () => {
    conPendiente(
      { id: "enr-1", sequence_id: "seq-1", tenant_id: "t1", contact_id: "c1",
        current_step: 0, reply_received: false, email_opened: false, email_clicked: false },
      { ...STEP_EMAIL, contact_email: "user@test.com", contact_name: "User" },
      [], // no hay siguiente paso → se completa
    );

    await svc.processDueEnrollments(sendEmail);
    expect(sendEmail).toHaveBeenCalledWith(
      "user@test.com",
      "Bienvenido",
      expect.stringContaining("/api/track/email/open/"),
    );
  });

  it("branch on opened follows yes path when email_opened=true", async () => {
    conPendiente(
      { id: "enr-1", sequence_id: "seq-1", tenant_id: "t1", contact_id: "c1",
        current_step: 2, reply_received: false, email_opened: true, email_clicked: false },
      { ...STEP_BRANCH,
        branch_condition: { field: "opened" as const, op: "eq" as const, value: true },
        branch_yes_position: 5, branch_no_position: 6,
        contact_email: "test@test.com", contact_name: "Test" },
      [{ position: 5, delay_days: 0, delay_hours: 0 }],
    );

    await svc.processDueEnrollments(sendEmail);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(avance()![1]).toContain(5);
  });

  it("branch on clicked follows no path when email_clicked=false", async () => {
    conPendiente(
      { id: "enr-1", sequence_id: "seq-1", tenant_id: "t1", contact_id: "c1",
        current_step: 2, reply_received: false, email_opened: true, email_clicked: false },
      { ...STEP_BRANCH,
        branch_condition: { field: "clicked" as const, op: "eq" as const, value: true },
        branch_yes_position: 5, branch_no_position: 6,
        contact_email: "test@test.com", contact_name: "Test" },
      [{ position: 6, delay_days: 0, delay_hours: 0 }],
    );

    await svc.processDueEnrollments(sendEmail);
    expect(avance()![1]).toContain(6);
  });

  it("marks enrollment failed when no contact email", async () => {
    conPendiente(
      { id: "enr-1", sequence_id: "seq-1", tenant_id: "t1", contact_id: "c1",
        current_step: 0, reply_received: false, email_opened: false, email_clicked: false },
      { ...STEP_EMAIL, contact_email: null, contact_name: "User" },
      [],
    );

    await svc.processDueEnrollments(sendEmail);
    const fallo = db.query.mock.calls.find((c) => /status='failed'/.test(c[0] as string));
    expect(fallo, "una inscripción sin correo se quedó activa para siempre").toBeDefined();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("y NO envía a quien retiró el consentimiento, aunque le tocara hoy", async () => {
    // El cierre va antes de elegir destinatarios: una baja llegada por una
    // campaña tiene que cerrar también las secuencias activas.
    db.query.mockImplementation(
      responderPorForma([
        [/FROM saas_contacts c/, [{ id: "enr-1" }]],
        [/next_send_at <= NOW\(\)/, []], // ya no está activa
      ]) as never,
    );

    await svc.processDueEnrollments(sendEmail);
    expect(sendEmail, "se escribió a alguien que pidió la baja").not.toHaveBeenCalled();
  });
});
