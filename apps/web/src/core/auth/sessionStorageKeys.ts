/** Short-lived app JWT for staging / dev (not HttpOnly — see /sign-in copy). */
export const JWT_SESSION_KEY = "nelvyon.jwt";

export const WORKSPACE_ID_STORAGE_KEY = "nelvyon.workspaceId";

/** Local-only activation flags (no backend step_key). */
export const LOCAL_ACTIVATION_FIRST_TICKET = "nelvyon.activation.first_ticket_done";
