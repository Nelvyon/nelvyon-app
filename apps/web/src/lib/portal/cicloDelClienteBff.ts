/**
 * Fábrica del ciclo del cliente para las rutas del portal.
 *
 * Existe para que las cuatro rutas nuevas no repitan el cableado, y para que el
 * `DbClient` se importe UNA vez de forma estática. Ese detalle no es estético:
 * veintinueve servicios lo pedían con `require()` y en el bundle de servidor de
 * Next eso devuelve `undefined`, lo que dejó siete rutas devolviendo 500 a
 * cualquier cliente nuevo. La puerta de build lo vigila desde entonces.
 */
import { DbClient } from "../../../../../backend/db/DbClient";
import { CerebroDeNegocioService } from "../../../../../backend/cerebro/CerebroDeNegocioService";
import { CicloDelClienteService } from "../../../../../backend/portal/CicloDelClienteService";

let ciclo: CicloDelClienteService | null = null;
let cerebro: CerebroDeNegocioService | null = null;

export function getCerebro(): CerebroDeNegocioService {
  if (!cerebro) cerebro = new CerebroDeNegocioService(DbClient.getInstance());
  return cerebro;
}

export function getCicloDelCliente(): CicloDelClienteService {
  if (!ciclo) ciclo = new CicloDelClienteService(DbClient.getInstance(), getCerebro());
  return ciclo;
}

export function reiniciarCicloParaPruebas(): void {
  ciclo = null;
  cerebro = null;
}
