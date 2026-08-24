/**
 * BLOQUE 3 · el núcleo y sus coherencias.
 *
 * Un catálogo de servicios vive en tres sitios: la lista de identificadores, el
 * registro que los instancia y la certificación por sector. Si los tres no
 * dicen lo mismo, el producto vende algo que no puede ejecutar, o ejecuta algo
 * que no vende.
 *
 * Son los fallos más aburridos de encontrar y los que más caro salen: nadie los
 * ve hasta que un cliente contrata un servicio que devuelve «desconocido».
 */
import { describe, expect, it } from "vitest";

import { OS_PREMIUM_SERVICE_IDS } from "../constants";
import { OS_AGENT_REGISTRY, instantiateOsAgent } from "../OsAgentRegistry";
import { OS_SECTOR_SERVICE_IDS, isSectorServiceId } from "../sectorOsRegistry";

describe("BLOQUE 3 · coherencia del catálogo", () => {
  it("EL CONTROL: las tres fuentes tienen contenido", () => {
    // Sin esto, tres listas vacías serían perfectamente coherentes entre sí y
    // todas las comprobaciones de abajo pasarían sobre la nada.
    expect(OS_PREMIUM_SERVICE_IDS.length).toBeGreaterThanOrEqual(25);
    expect(Object.keys(OS_AGENT_REGISTRY).length).toBeGreaterThanOrEqual(25);
    expect(OS_SECTOR_SERVICE_IDS.length).toBeGreaterThan(50);
  });

  it("todo identificador Premium declarado se puede INSTANCIAR", () => {
    // El fallo caro: el catálogo lo ofrece, el cliente lo contrata, y al
    // ejecutarlo no hay agente detrás.
    const rotos: string[] = [];
    for (const id of OS_PREMIUM_SERVICE_IDS) {
      if (!instantiateOsAgent(id)) rotos.push(id);
    }
    expect(rotos, "servicios que se ofrecen y no se pueden ejecutar").toEqual([]);
  });

  it("todo agente del registro está declarado en la lista de identificadores", () => {
    // La dirección contraria: un agente que existe y no está en el catálogo es
    // trabajo hecho que nadie puede pedir.
    const declarados = new Set<string>(OS_PREMIUM_SERVICE_IDS);
    const huerfanos = Object.keys(OS_AGENT_REGISTRY).filter((id) => !declarados.has(id));
    expect(huerfanos).toEqual([]);
  });

  it("no hay identificadores repetidos", () => {
    expect(new Set(OS_PREMIUM_SERVICE_IDS).size).toBe(OS_PREMIUM_SERVICE_IDS.length);
    expect(new Set(OS_SECTOR_SERVICE_IDS).size).toBe(OS_SECTOR_SERVICE_IDS.length);
  });

  it("los servicios Premium y los de sector no se solapan", () => {
    // Si un identificador estuviera en los dos registros, cuál de los dos
    // agentes se instancia dependería del orden de resolución, y eso es un bug
    // que aparece y desaparece.
    const premium = new Set<string>(OS_PREMIUM_SERVICE_IDS);
    const solapados = OS_SECTOR_SERVICE_IDS.filter((id) => premium.has(id));
    expect(solapados).toEqual([]);
  });

  it("un identificador inventado no instancia nada, ni Premium ni de sector", () => {
    // Fallo cerrado en las dos puertas de entrada.
    expect(instantiateOsAgent("servicio_inventado_premium")).toBeNull();
    expect(isSectorServiceId("servicio_inventado_sector")).toBe(false);
  });

  it("cada agente Premium declara el `serviceId` con el que se le invoca", () => {
    // Si el `serviceId` interno no coincidiera con la clave del registro, la
    // traza y los informes atribuirían el trabajo a otro servicio.
    const discordantes: string[] = [];
    for (const [clave, crear] of Object.entries(OS_AGENT_REGISTRY)) {
      const agente = (crear as () => { serviceId: string })();
      if (agente.serviceId !== clave) discordantes.push(`${clave} dice ser ${agente.serviceId}`);
    }
    expect(discordantes).toEqual([]);
  });

  it("ningún agente Premium se queda sin pasos", () => {
    // Un servicio con cero pasos se completaría al instante y devolvería un
    // resultado vacío que parecería correcto.
    const vacios: string[] = [];
    for (const [clave, crear] of Object.entries(OS_AGENT_REGISTRY)) {
      const agente = (crear as () => { steps: unknown[] })();
      if (!agente.steps.length) vacios.push(clave);
    }
    expect(vacios).toEqual([]);
  });
});
