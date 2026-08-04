import { NextResponse } from "next/server";

import { DbClient } from "../../../../../../backend/db/DbClient";
import { getCurrentStatus } from "@nelvyon/monitoring";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET() {
  try {
    // `DbClient.getInstance()` lanza de forma SINCRONA si falta DATABASE_URL.
    // Invocado directamente dentro del array de `Promise.all`, abortaba la
    // construccion del array despues de que `getCurrentStatus()` ya hubiera
    // devuelto una promesa rechazada: esa promesa se quedaba sin manejador y
    // el `unhandledRejection` de server.js tumbaba el proceso entero, aunque
    // este `catch` devolviese su respuesta de reserva. Envolviendolo en una
    // funcion async, el throw sincrono se convierte en rechazo y `Promise.all`
    // llega siempre a manejar ambas promesas.
    const consultaIncidencias = async () =>
      DbClient.getInstance().query<{
        id: string;
        title: string;
        message: string;
        severity: string;
        resolved: boolean;
        created_at: string;
      }>(
        `SELECT id, title, message, severity, resolved, created_at
         FROM incidents
         WHERE resolved = false OR created_at > now() - interval '7 days'
         ORDER BY created_at DESC
         LIMIT 10`,
      );

    const [current, incidents] = await Promise.all([getCurrentStatus(), consultaIncidencias()]);

    const allUp = Object.values(current).every((s) => s.status === "up");
    const anyDown = Object.values(current).some((s) => s.status === "down");
    const overallStatus = anyDown ? "down" : allUp ? "operational" : "degraded";

    return NextResponse.json({
      status: overallStatus,
      services: current,
      incidents,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "unknown", services: {}, incidents: [], updatedAt: new Date().toISOString() },
      { status: 200 },
    );
  }
}
