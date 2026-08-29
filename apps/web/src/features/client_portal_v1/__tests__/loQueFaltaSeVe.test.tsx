/**
 * LO QUE FALTA SE VE.
 *
 * QUÉ SE ESTÁ PROTEGIENDO. En producción hay doce trabajos encolados desde
 * junio que nunca arrancaron. El sistema producía —cinco mil entregables
 * aprobados—, pero cuando algo se atascaba en el arranque, el cliente no tenía
 * forma de enterarse: el portal le enseñaba proyectos y entregables, nunca «nos
 * falta un dato tuyo».
 *
 * Estas pruebas comprueban las dos direcciones, que es lo único que hace útil a
 * una suite de interfaz:
 *
 *   · un bloqueo SE VE, y se distingue de una sugerencia;
 *   · cuando no hay nada pendiente, NO se ocupa la pantalla con un cartel de
 *     que todo va bien. Un aviso permanente se vuelve decorado en tres días.
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoQueFaltaParaEmpezar } from "@/features/client_portal_v1/components/LoQueFaltaParaEmpezar";
import type { ConexionPendiente, HuecoDelCliente } from "@/features/client_portal_v1/cicloTypes";

const hueco = (over: Partial<HuecoDelCliente> = {}): HuecoDelCliente => ({
  dimension: "objetivos",
  pregunta: "¿Qué quieres conseguir en los próximos tres meses?",
  imprescindible: true,
  motivo: "ausente",
  ...over,
});

const conexion = (over: Partial<ConexionPendiente> = {}): ConexionPendiente => ({
  proveedor: "google_ads",
  estado: "necesaria",
  paraQue: "Ver qué búsquedas te traen clientes y dejar de pagar por las que no.",
  servicios: ["Publicidad de pago"],
  conectadaEn: null,
  ...over,
});

describe("lo que falta se ve", () => {
  it("un dato imprescindible que falta se enseña, y se dice que bloquea", () => {
    render(
      <LoQueFaltaParaEmpezar datos={[hueco()]} conexiones={[]} listoParaOperar={false} />,
    );
    expect(screen.getByText(/Necesitamos esto para poder empezar/i)).toBeTruthy();
    expect(screen.getByText(/¿Qué quieres conseguir/i)).toBeTruthy();
    expect(screen.getByText(/tu trabajo está parado/i)).toBeTruthy();
  });

  it("EL CONTROL: sin nada pendiente, no se ocupa la pantalla", () => {
    const { container } = render(
      <LoQueFaltaParaEmpezar datos={[]} conexiones={[]} listoParaOperar />,
    );
    expect(
      container.innerHTML,
      "un panel que celebra que todo va bien ocupa el sitio de lo que sí importa",
    ).toBe("");
  });

  it("lo imprescindible y lo que sólo ayuda NO se mezclan", () => {
    // Mezclarlos hace que las dos cosas parezcan igual de urgentes, y entonces
    // ninguna lo parece.
    render(
      <LoQueFaltaParaEmpezar
        datos={[
          hueco({ dimension: "objetivos", pregunta: "OBLIGATORIO", imprescindible: true }),
          hueco({ dimension: "marca", pregunta: "OPCIONAL", imprescindible: false }),
        ]}
        conexiones={[]}
        listoParaOperar={false}
      />,
    );
    // NO BASTA CON QUE APAREZCAN LOS DOS: hay que comprobar DÓNDE aparece cada
    // uno. La primera versión de esta prueba sólo miraba que existieran, y una
    // mutación que metía lo opcional dentro de «Imprescindible» la pasaba
    // entera — que es justo el defecto que este bloque existe para evitar.
    const bloque = screen.getByText("Imprescindible").closest("div");
    expect(bloque).not.toBeNull();
    expect(bloque!.textContent).toContain("OBLIGATORIO");
    expect(
      bloque!.textContent,
      "lo opcional se ha colado en la lista de lo que bloquea",
    ).not.toContain("OPCIONAL");

    // Y lo opcional sigue estando, plegado y contado aparte.
    expect(screen.getByText(/Nos ayudaría saber \(1\)/)).toBeTruthy();
  });

  it("pedir un acceso SIEMPRE dice para qué", () => {
    // Pedirle a alguien acceso a su cuenta de publicidad sin explicar para qué
    // es pedirle un acto de fe.
    render(
      <LoQueFaltaParaEmpezar datos={[]} conexiones={[conexion()]} listoParaOperar={false} />,
    );
    expect(screen.getByText(/dejar de pagar por las que no/i)).toBeTruthy();
  });

  it("un proveedor con nombre en clave se enseña con su nombre real", () => {
    // `meta_ads` A PROPÓSITO, y no `google_ads`. Con `google_ads` el mapa y el
    // respaldo automático producen el mismo texto —«Google Ads»—, así que la
    // prueba pasaba igual aunque el mapa no se consultara. `meta_ads` los
    // separa: el mapa dice «Meta (Facebook e Instagram)» y el respaldo diría
    // «Meta Ads».
    render(
      <LoQueFaltaParaEmpezar
        datos={[]}
        conexiones={[conexion({ proveedor: "meta_ads" })]}
        listoParaOperar={false}
      />,
    );
    expect(screen.getByText("Meta (Facebook e Instagram)")).toBeTruthy();
    expect(screen.queryByText("meta_ads")).toBeNull();
    expect(screen.queryByText("Meta Ads")).toBeNull();
  });

  it("un proveedor desconocido no se rompe ni enseña el identificador crudo", () => {
    render(
      <LoQueFaltaParaEmpezar
        datos={[]}
        conexiones={[conexion({ proveedor: "algo_nuevo_ads" })]}
        listoParaOperar={false}
      />,
    );
    expect(screen.getByText("Algo Nuevo Ads")).toBeTruthy();
  });

  it("un acceso caducado se distingue de uno que nunca se dio", () => {
    // No es lo mismo «danos acceso» que «el acceso que nos diste dejó de
    // funcionar y llevamos sin datos desde entonces». La segunda es urgente y
    // además es culpa compartida.
    render(
      <LoQueFaltaParaEmpezar
        datos={[]}
        conexiones={[conexion({ estado: "caducada" })]}
        listoParaOperar={false}
      />,
    );
    expect(screen.getByText(/ha caducado y hemos dejado de recibir datos/i)).toBeTruthy();
  });

  it("un dato caducado explica que puede haber cambiado", () => {
    render(
      <LoQueFaltaParaEmpezar
        datos={[hueco({ motivo: "caducada" })]}
        conexiones={[]}
        listoParaOperar={false}
      />,
    );
    expect(screen.getByText(/puede haber cambiado/i)).toBeTruthy();
  });

  it("se puede trabajar pero quedan mejoras: se dice sin alarmar", () => {
    render(
      <LoQueFaltaParaEmpezar
        datos={[hueco({ imprescindible: false, pregunta: "¿Tienes logotipo en vectorial?" })]}
        conexiones={[]}
        listoParaOperar
      />,
    );
    expect(screen.getByText(/hay cosas que nos ayudarían/i)).toBeTruthy();
    expect(screen.queryByText(/tu trabajo está parado/i)).toBeNull();
  });
});
