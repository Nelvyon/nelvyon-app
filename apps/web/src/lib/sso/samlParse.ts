import crypto from "crypto";
import zlib from "zlib";

import { XMLParser } from "fast-xml-parser";

export type SamlAssertion = {
  nameId: string;
  email?: string;
  sessionIndex?: string;
};

function extractX509FromMetadata(xml: string): string | null {
  const match = xml.match(/<(?:[\w:]+:)?X509Certificate>([^<]+)<\/(?:[\w:]+:)?X509Certificate>/i);
  if (!match?.[1]) return null;
  const body = match[1].replace(/\s+/g, "");
  return `-----BEGIN CERTIFICATE-----\n${body.match(/.{1,64}/g)?.join("\n") ?? body}\n-----END CERTIFICATE-----`;
}

export async function fetchIdpCertificate(metadataUrl: string): Promise<string | null> {
  try {
    const res = await fetch(metadataUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const xml = await res.text();
    return extractX509FromMetadata(xml);
  } catch {
    return null;
  }
}

/** Build HTTP-Redirect SAML AuthnRequest (deflate + base64). */
export function buildSamlAuthnRedirectUrl(params: {
  idpSsoUrl: string;
  acsUrl: string;
  issuer: string;
  relayState: string;
}): string {
  const id = `_${crypto.randomUUID()}`;
  const issueInstant = new Date().toISOString();
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"`,
    ` ID="${id}" Version="2.0" IssueInstant="${issueInstant}"`,
    ` Destination="${params.idpSsoUrl}" AssertionConsumerServiceURL="${params.acsUrl}"`,
    ` ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">`,
    `<saml:Issuer>${params.issuer}</saml:Issuer>`,
    `<samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>`,
    `</samlp:AuthnRequest>`,
  ].join("");
  const deflated = zlib.deflateRawSync(Buffer.from(xml, "utf8"));
  const encoded = deflated.toString("base64");
  const url = new URL(params.idpSsoUrl);
  url.searchParams.set("SAMLRequest", encoded);
  url.searchParams.set("RelayState", params.relayState);
  return url.toString();
}

function verifyXmlSignature(xml: string, certPem: string): boolean {
  const sigMatch = xml.match(/<(?:[\w:]+:)?SignatureValue>([^<]+)<\/(?:[\w:]+:)?SignatureValue>/i);
  const signedInfoMatch = xml.match(/<(?:[\w:]+:)?SignedInfo[\s\S]*?<\/(?:[\w:]+:)?SignedInfo>/i);
  if (!sigMatch?.[1] || !signedInfoMatch?.[0]) return false;
  try {
    const sig = Buffer.from(sigMatch[1].replace(/\s+/g, ""), "base64");
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(signedInfoMatch[0]);
    return verifier.verify(certPem, sig);
  } catch {
    return false;
  }
}

/** Parse SAML Response (base64) and extract NameID + email attribute. */
export async function parseSamlResponse(
  samlResponseB64: string,
  options?: { idpCertPem?: string | null; metadataUrl?: string | null },
): Promise<SamlAssertion> {
  const xml = Buffer.from(samlResponseB64, "base64").toString("utf8");

  let cert = options?.idpCertPem?.trim() || process.env.SAAS_SAML_IDP_CERT?.trim() || null;
  if (!cert && options?.metadataUrl) {
    cert = await fetchIdpCertificate(options.metadataUrl);
  }
  if (cert && xml.includes("Signature") && !verifyXmlSignature(xml, cert)) {
    throw new Error("SAML assertion signature validation failed");
  }
  if (xml.includes("Signature") && !cert) {
    throw new Error("SAML signature present but no IdP certificate configured");
  }
  if (!xml.includes("Signature") && process.env.SAAS_SAML_REQUIRE_SIGNATURE === "true") {
    throw new Error("Unsigned SAML response rejected");
  }

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
  const statusCode = (resp.Status as Record<string, unknown> | undefined)?.StatusCode as Record<string, unknown> | undefined;
  const statusValue = String(statusCode?.["@_Value"] ?? "");
  if (statusValue && !statusValue.includes("Success")) {
    throw new Error(`SAML status not success: ${statusValue}`);
  }

  const assertion = resp.Assertion ?? resp["saml:Assertion"];
  if (!assertion || typeof assertion !== "object") {
    throw new Error("SAML Assertion missing");
  }
  const ass = assertion as Record<string, unknown>;

  const conditions = ass.Conditions as Record<string, unknown> | undefined;
  const notOnOrAfter = conditions?.["@_NotOnOrAfter"] ? new Date(String(conditions["@_NotOnOrAfter"])) : null;
  if (notOnOrAfter && notOnOrAfter.getTime() < Date.now()) {
    throw new Error("SAML assertion expired");
  }

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
