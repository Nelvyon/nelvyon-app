/* eslint-disable @next/next/no-html-link-for-pages -- static 404 must not depend on Next runtime */
export default function NotFound() {
  return (
    <html>
      <body>
        <h1>404 - Página no encontrada</h1>
        <a href="/">Volver al inicio</a>
      </body>
    </html>
  );
}
