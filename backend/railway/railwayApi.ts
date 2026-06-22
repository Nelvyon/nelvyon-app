const RAILWAY_GQL = "https://backboard.railway.app/graphql/v2";

export type RailwayEnvUpdateResult = {
  ok: boolean;
  updated: string[];
  skipped: boolean;
  reason?: string;
};

function railwayCredentials(): {
  token: string;
  projectId: string;
  environmentId: string;
  serviceId: string;
} | null {
  const token = (process.env.RAILWAY_API_TOKEN ?? process.env.RAILWAY_TOKEN ?? "").trim();
  const projectId = process.env.RAILWAY_PROJECT_ID?.trim() ?? "";
  const environmentId = process.env.RAILWAY_ENVIRONMENT_ID?.trim() ?? "";
  const serviceId = process.env.RAILWAY_SERVICE_ID?.trim() ?? "";
  if (!token || !projectId || !environmentId || !serviceId) return null;
  return { token, projectId, environmentId, serviceId };
}

/** Actualiza variables en Railway vía GraphQL (dispara redeploy). */
export async function railwaySetServiceVariables(
  variables: Record<string, string>,
): Promise<RailwayEnvUpdateResult> {
  const creds = railwayCredentials();
  if (!creds) {
    return {
      ok: false,
      skipped: true,
      updated: [],
      reason:
        "Faltan RAILWAY_API_TOKEN (o RAILWAY_TOKEN) + RAILWAY_PROJECT_ID + RAILWAY_ENVIRONMENT_ID + RAILWAY_SERVICE_ID",
    };
  }

  const query = `
    mutation variableCollectionUpsert($input: VariableCollectionUpsertInput!) {
      variableCollectionUpsert(input: $input)
    }
  `;

  const res = await fetch(RAILWAY_GQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${creds.token}`,
    },
    body: JSON.stringify({
      query,
      variables: {
        input: {
          projectId: creds.projectId,
          environmentId: creds.environmentId,
          serviceId: creds.serviceId,
          variables,
        },
      },
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    data?: { variableCollectionUpsert?: boolean };
    errors?: Array<{ message: string }>;
  };

  if (!res.ok || body.errors?.length) {
    const msg = body.errors?.map((e) => e.message).join("; ") || `HTTP ${res.status}`;
    throw new Error(`Railway variableCollectionUpsert failed: ${msg}`);
  }

  return { ok: true, skipped: false, updated: Object.keys(variables) };
}
