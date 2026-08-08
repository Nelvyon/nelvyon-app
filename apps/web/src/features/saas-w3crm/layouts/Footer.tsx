import Link from "next/link";
import React from "react";

/**
 * Footer de W3CRM con la marca legal de NELVYON.
 * Se conservan la estructura (`footer out-footer` > `copyright` > `p`) y las
 * clases originales de la plantilla; solo cambia el contenido de la marca.
 */
const Footer = () => {
	const d = new Date();
	return (
		<div className="footer out-footer">
			<div className="copyright">
				<p>Copyright ©{" "}
					<Link href="/">NELVYON</Link>{" "}
					{d.getFullYear()} · Todos los derechos reservados ·{" "}
					<Link href="/aviso-legal">Aviso legal</Link> ·{" "}
					<Link href="/privacidad">Privacidad</Link>
				</p>
			</div>
		</div>
	);
};

export default Footer;
