import Link from "next/link";
import React from "react";

/**
 * Footer de W3CRM con la marca legal de NELVYON.
 * Se conservan la estructura (`footer out-footer` > `copyright` > `p`) y las
 * clases originales de la plantilla; solo cambia el contenido de la marca.
 *
 * Los tres enlaces van SUBRAYADOS. Estan dentro de un parrafo de texto y solo
 * se distinguian por el color, que es la violacion `link-in-text-block` de
 * WCAG: quien no distingue ese azul del gris de alrededor no ve que ahi hay
 * algo que pulsar. axe la conto 20 veces por enlace, porque este pie sale en
 * todas las pantallas del panel.
 */
const Footer = () => {
	const d = new Date();
	return (
		<div className="footer out-footer">
			<div className="copyright">
				<p>Copyright ©{" "}
					<Link className="underline" href="/">NELVYON</Link>{" "}
					{d.getFullYear()} · Todos los derechos reservados ·{" "}
					<Link className="underline" href="/aviso-legal">Aviso legal</Link> ·{" "}
					<Link className="underline" href="/privacidad">Privacidad</Link>
				</p>
			</div>
		</div>
	);
};

export default Footer;
