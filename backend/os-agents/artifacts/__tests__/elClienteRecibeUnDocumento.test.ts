/**
 * EL CLIENTE RECIBE UN DOCUMENTO, NO UN JSON.
 *
 * DE DÓNDE SALE ESTO. De los veinticinco servicios que NELVYON vende, ocho
 * terminaban produciendo un fichero que el cliente puede abrir. Los otros
 * diecisiete terminaban en la salida del último paso del agente: texto, en
 * JSON, dentro del resultado de un trabajo.
 *
 * Un cliente que paga 950 € y recibe un objeto con seis campos de texto no ha
 * recibido el servicio: ha recibido las notas de quien iba a hacerlo.
 *
 * LO QUE ESTAS PRUEBAS PROTEGEN, y no es la maquetación:
 *
 *   · que NO se invente nada. El documento reordena lo que el agente produjo;
 *     un apartado vacío se dice vacío, no se rellena.
 *   · que un documento incompleto NO parezca completo. Los pasos sin contenido
 *     se cuentan en el propio documento.
 *   · que el modo de producción vaya DENTRO. Un cliente tiene derecho a saber
 *     si esto lo revisó un modelo o unas reglas — la misma regla que rige el
 *     motor de calidad.
 *   · que un servicio con entregable propio NO reciba además el genérico.
 */
import { describe, expect, it } from "vitest";

import {
  construirEntregable,
  yaTieneEntregable,
  type PasoProducido,
} from "../entregableDeServicio";

const paso = (name: string, output: string): PasoProducido => ({ name, data: { output } });

describe("el cliente recibe un documento", () => {
  it("compone Markdown y HTML con lo que el agente produjo", () => {
    const files = construirEntregable({
      serviceId: "seo_premium",
      nombreDelServicio: "SEO Premium",
      cliente: "Casa Manuela",
      jobId: "j-1",
      pasos: [paso("seo_audit", "La ficha de Google no tiene horario de agosto.")],
    });

    expect(Object.keys(files).sort()).toEqual(["informe.html", "informe.md"]);
    expect(files["informe.md"]).toContain("SEO Premium");
    expect(files["informe.md"]).toContain("Casa Manuela");
    expect(files["informe.md"]).toContain("horario de agosto");
    expect(files["informe.html"]).toContain("<h1>SEO Premium</h1>");
  });

  it("NO INVENTA: lo que el agente no produjo no aparece", () => {
    const files = construirEntregable({
      serviceId: "x",
      jobId: "j",
      pasos: [paso("analysis", "contenido real"), paso("strategy", "")],
    });
    expect(files["informe.md"]).toContain("contenido real");
    // El paso vacío no genera un apartado con relleno.
    expect(files["informe.md"]).not.toContain("## Estrategia");
  });

  it("y DICE cuántos apartados quedaron vacíos", () => {
    // Omitirlos en silencio haría que un documento incompleto pareciera
    // completo, que es exactamente el fallo que este proyecto persigue.
    const files = construirEntregable({
      serviceId: "x",
      jobId: "j",
      pasos: [paso("analysis", "algo"), paso("strategy", ""), paso("measurement", "")],
    });
    expect(files["informe.md"]).toContain("2 apartado(s) no produjeron contenido");
  });

  it("EL CONTROL: sin apartados vacíos, no se dice nada", () => {
    const files = construirEntregable({
      serviceId: "x",
      jobId: "j",
      pasos: [paso("analysis", "algo"), paso("strategy", "otra cosa")],
    });
    expect(files["informe.md"]).not.toContain("no produjeron contenido");
  });

  it("EL MODO SIMULADO SE AVISA, y arriba", () => {
    const files = construirEntregable({
      serviceId: "x",
      jobId: "j",
      pasos: [paso("analysis", "algo")],
      modoDeProduccion: "MOCK",
    });
    expect(files["informe.md"]).toContain("modo simulado");
    expect(files["informe.md"]).toContain("NO es trabajo real");
    // Y antes del contenido, no escondido al final.
    const iAviso = files["informe.md"].indexOf("modo simulado");
    const iContenido = files["informe.md"].indexOf("algo");
    expect(iAviso).toBeLessThan(iContenido);
  });

  it("y lo que no se pudo verificar también se avisa", () => {
    const files = construirEntregable({
      serviceId: "x",
      jobId: "j",
      pasos: [paso("analysis", "algo")],
      modoDeProduccion: "UNAVAILABLE",
    });
    expect(files["informe.md"]).toContain("sin verificar");
  });

  it("EL CONTROL: con modelo real no se mete un aviso que asuste", () => {
    const files = construirEntregable({
      serviceId: "x",
      jobId: "j",
      pasos: [paso("analysis", "algo")],
      modoDeProduccion: "REAL",
    });
    expect(files["informe.md"]).not.toContain("ATENCIÓN");
    expect(files["informe.md"]).not.toContain("sin verificar");
  });

  it("un JSON del agente se convierte en apartados legibles", () => {
    // El agente pide JSON al modelo. Volcarlo tal cual en el documento del
    // cliente sería entregarle la materia prima.
    const files = construirEntregable({
      serviceId: "x",
      jobId: "j",
      pasos: [
        paso(
          "analysis",
          JSON.stringify({
            result: "Tu ficha no tiene horario",
            recommendedActions: ["Actualizar el horario", "Responder las reseñas"],
          }),
        ),
      ],
    });
    expect(files["informe.md"]).toContain("Tu ficha no tiene horario");
    expect(files["informe.md"]).toContain("- Actualizar el horario");
    expect(files["informe.md"]).not.toContain('{"result"');
  });

  it("si el modelo NO devolvió JSON, el texto se conserva igual", () => {
    // Un entregable que revienta porque la respuesta no era JSON es un
    // entregable que no llega. Degradar a texto no oculta nada: el contenido
    // es el mismo.
    const files = construirEntregable({
      serviceId: "x",
      jobId: "j",
      pasos: [paso("analysis", "Esto es prosa, no JSON, y debe llegar entera.")],
    });
    expect(files["informe.md"]).toContain("Esto es prosa, no JSON, y debe llegar entera.");
  });

  it("el HTML escapa lo que le meten", () => {
    const files = construirEntregable({
      serviceId: "x",
      jobId: "j",
      cliente: "<script>alert(1)</script>",
      pasos: [paso("analysis", "<img onerror=alert(1)>")],
    });
    expect(files["informe.html"]).not.toContain("<script>alert");
    expect(files["informe.html"]).toContain("&lt;script&gt;");
  });

  describe("no se duplica el entregable", () => {
    it("un servicio que ya publicó el suyo se reconoce", () => {
      expect(
        yaTieneEntregable([
          paso("bundle_publish", JSON.stringify({ downloadUrl: "/api/os/x.zip", assetId: "a1" })),
        ]),
      ).toBe(true);
    });

    it("EL CONTROL: uno que sólo produjo texto, no", () => {
      expect(yaTieneEntregable([paso("analysis", "texto sin artefacto")])).toBe(false);
    });
  });
});
