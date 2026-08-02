import { pageContent, siteBrand } from "../content/siteContent";
import { BrandCheck } from "./BrandCheck";
import { BrandPageHero } from "./BrandPageHero";
import { ContactForm } from "./ContactForm";

export function ContactPage() {
  const content = pageContent.contacto;

  return (
    <>
      <BrandPageHero
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        primaryCta={{ label: "Escribir por email", href: `mailto:${siteBrand.contactEmail}` }}
        secondaryCta={{ label: "Ver precios", href: "/precios" }}
      />

      <section className="space overflow-hidden">
        <div className="container th-container5">
          <div className="row gy-5">
            <div className="col-lg-5">
              {content.sections.map((section) => (
                <article
                  key={section.heading}
                  style={{
                    padding: 24,
                    borderRadius: 16,
                    border: "1px solid #E0E0E0",
                    marginBottom: 16,
                    background: "#fff",
                  }}
                >
                  <h2 className="h5">{section.heading}</h2>
                  <p className="mb-0">{section.body}</p>
                  {"bullets" in section && section.bullets?.length ? (
                    <ul className="hero-list mt-3" style={{ textAlign: "left" }}>
                      {section.bullets.map((b: string) => (
                        <li key={b}>
                          <BrandCheck /> {b}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
              <div style={{ padding: 24, borderRadius: 16, background: "#F4F7FF" }}>
                <p className="mb-2">
                  Comercial:{" "}
                  <a href={`mailto:${siteBrand.contactEmail}`}>{siteBrand.contactEmail}</a>
                </p>
                <p className="mb-0">
                  Soporte:{" "}
                  <a href={`mailto:${siteBrand.supportEmail}`}>{siteBrand.supportEmail}</a>
                </p>
              </div>
            </div>
            <div className="col-lg-7">
              <div
                style={{
                  padding: 32,
                  borderRadius: 16,
                  border: "1px solid #E0E0E0",
                  background: "#fff",
                }}
              >
                <h2 className="sec-title h4">Cuéntenos su operación</h2>
                <p>Respuesta humana. Formulario real vía API NELVYON — sin captura demo.</p>
                <div className="mt-4">
                  <ContactForm />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
