import { XMLParser } from "fast-xml-parser";

export type SamlAssertion = {
  nameId: string;
  email?: string;
  sessionIndex?: string;
};

/** Parse SAML Response (base64) and extract NameID + email attribute. */
export function parseSamlResponse(samlResponseB64: string): SamlAssertion {
  const xml = Buffer.from(samlResponseB64, "base64").toString("utf8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
  });
  const doc = parser.parse(xml) as Record<string, unknown>;

  const response = doc.Response ?? doc["samlp:Response"];
  if (!response || typeof response !== "object") {
    throw new Error("Invalid SAML Response");
  }
  const resp = response as Record<string, unknown>;
  const assertion = resp.Assertion ?? resp["saml:Assertion"];
  if (!assertion || typeof assertion !== "object") {
    throw new Error("SAML Assertion missing");
  }
  const ass = assertion as Record<string, unknown>;
  const subject = ass.Subject as Record<string, unknown> | undefined;
  const nameIdNode = subject?.NameID;
  const nameId =
    typeof nameIdNode === "string"
      ? nameIdNode
      : typeof nameIdNode === "object" && nameIdNode !== null
        ? String((nameIdNode as Record<string, unknown>)["#text"] ?? "")
        : "";
  if (!nameId.trim()) throw new Error("SAML NameID missing");

  let email: string | undefined;
  const attrStatement = ass.AttributeStatement as Record<string, unknown> | undefined;
  const attrs = attrStatement?.Attribute;
  const attrList = Array.isArray(attrs) ? attrs : attrs ? [attrs] : [];
  for (const attr of attrList) {
    if (typeof attr !== "object" || attr === null) continue;
    const a = attr as Record<string, unknown>;
    const attrName = String(a["@_Name"] ?? a["@_name"] ?? "").toLowerCase();
    if (!attrName.includes("email") && attrName !== "mail") continue;
    const val = a.AttributeValue;
    email = typeof val === "string" ? val : String((val as Record<string, unknown>)?.["#text"] ?? val ?? "");
    break;
  }

  const authnStatement = ass.AuthnStatement as Record<string, unknown> | undefined;
  const sessionIndex = authnStatement?.["@_SessionIndex"]
    ? String(authnStatement["@_SessionIndex"])
    : undefined;

  if (!email && nameId.includes("@")) email = nameId;

  return { nameId: nameId.trim(), email: email?.trim() || undefined, sessionIndex };
}
