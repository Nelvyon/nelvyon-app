/**
 * Nelvyon Forms Embed Widget v1
 * Usage: <script src="https://app.nelvyon.com/embed/form.js" data-form-id="FORM_UUID" async></script>
 */
(function () {
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  var formId = script.getAttribute("data-form-id");
  if (!formId) { console.warn("[Nelvyon] data-form-id missing"); return; }

  var baseUrl = (function () {
    var src = script.src || "";
    var m = src.match(/^(https?:\/\/[^/]+)/);
    return m ? m[1] : "";
  })();

  var container = document.createElement("div");
  container.id = "nelvyon-form-" + formId;
  container.style.cssText = "font-family:system-ui,sans-serif;max-width:480px;";
  script.parentNode.insertBefore(container, script.nextSibling);

  var CSS = [
    ".nlv-form{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.08);}",
    ".nlv-form h2{margin:0 0 16px;font-size:1.125rem;color:#111827;}",
    ".nlv-field{margin-bottom:16px;}",
    ".nlv-label{display:block;font-size:.875rem;font-weight:500;color:#374151;margin-bottom:4px;}",
    ".nlv-input{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:8px;padding:8px 12px;font-size:.875rem;outline:none;transition:border-color .15s;}",
    ".nlv-input:focus{border-color:#0084ff;box-shadow:0 0 0 2px rgba(0,132,255,.15);}",
    ".nlv-btn{background:#0084ff;color:#fff;border:none;border-radius:8px;padding:10px 24px;font-size:.875rem;font-weight:600;cursor:pointer;width:100%;margin-top:8px;transition:background .15s;}",
    ".nlv-btn:hover{background:#0070d8;}",
    ".nlv-btn:disabled{background:#9ca3af;cursor:not-allowed;}",
    ".nlv-ok{color:#059669;font-size:.875rem;text-align:center;padding:16px 0;}",
    ".nlv-err{color:#dc2626;font-size:.75rem;margin-top:4px;}",
    ".nlv-hp{display:none!important;position:absolute;left:-9999px;}"
  ].join("");

  var styleEl = document.createElement("style");
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  function render(form) {
    var html = '<div class="nlv-form">';
    html += '<h2>' + esc(form.name) + '</h2>';
    if (form.description) html += '<p style="margin:0 0 16px;font-size:.875rem;color:#6b7280;">' + esc(form.description) + '</p>';

    (form.fields || []).forEach(function (f) {
      var fieldName = f.name || f.id || f.label;
      var tag = (f.type === "textarea") ? "textarea" : "input";
      var req = f.required ? ' required' : '';
      html += '<div class="nlv-field">';
      html += '<label class="nlv-label" for="nlv-' + esc(fieldName) + '">' + esc(f.label) + (f.required ? ' <span style="color:#ef4444">*</span>' : '') + '</label>';
      if (f.type === "textarea") {
        html += '<textarea id="nlv-' + esc(fieldName) + '" name="' + esc(fieldName) + '" class="nlv-input" placeholder="' + esc(f.placeholder || "") + '" rows="4"' + req + '></textarea>';
      } else if (f.type === "select" && Array.isArray(f.options)) {
        html += '<select id="nlv-' + esc(fieldName) + '" name="' + esc(fieldName) + '" class="nlv-input"' + req + '>';
        html += '<option value="">— Selecciona —</option>';
        f.options.forEach(function (o) { html += '<option value="' + esc(o) + '">' + esc(o) + '</option>'; });
        html += '</select>';
      } else {
        html += '<input id="nlv-' + esc(fieldName) + '" name="' + esc(fieldName) + '" type="' + esc(f.type || "text") + '" class="nlv-input" placeholder="' + esc(f.placeholder || "") + '"' + req + '>';
      }
      html += '</div>';
    });

    // Honeypot
    html += '<div class="nlv-hp" aria-hidden="true"><input name="' + esc(form.honeypotField || '_hp') + '" tabindex="-1" autocomplete="off"></div>';
    html += '<button type="submit" class="nlv-btn">Enviar</button>';
    html += '</div>';

    container.innerHTML = '<form id="nlv-form-inner">' + html + '</form>';

    container.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = container.querySelector(".nlv-btn");
      btn.disabled = true;
      btn.textContent = "Enviando…";

      var fd = new FormData(e.target);
      var payload = {};
      fd.forEach(function (v, k) { payload[k] = v; });

      fetch(baseUrl + "/api/forms/" + formId + "/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.ok) {
            container.innerHTML = '<div class="nlv-form nlv-ok">✅ ¡Gracias! Hemos recibido tu mensaje.</div>';
          } else {
            btn.disabled = false;
            btn.textContent = "Enviar";
            var errDiv = document.createElement("p");
            errDiv.className = "nlv-err";
            errDiv.textContent = d.error || "Error al enviar. Inténtalo de nuevo.";
            btn.parentNode.insertBefore(errDiv, btn);
          }
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = "Enviar";
        });
    });
  }

  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  fetch(baseUrl + "/api/forms/" + formId, { headers: { "Accept": "application/json" } })
    .then(function (r) { return r.json(); })
    .then(function (form) {
      if (form.error) { container.innerHTML = ""; return; }
      render(form);
    })
    .catch(function () { container.innerHTML = ""; });
})();
