(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var token = script.getAttribute("data-token");
  if (!token) {
    console.warn("[NELVYON Chatbot] Missing data-token attribute");
    return;
  }

  var apiOrigin = new URL(script.src).origin;
  var storageKey = "nelvyon_chatbot_session_" + token;

  function getSessionId() {
    try {
      var sid = localStorage.getItem(storageKey);
      if (sid) return sid;
      sid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
      localStorage.setItem(storageKey, sid);
      return sid;
    } catch (e) {
      return "sess-" + Date.now();
    }
  }

  var config = null;
  var sessionId = getSessionId();
  var open = false;
  var sending = false;

  var root = document.createElement("div");
  root.id = "nelvyon-chatbot-root";
  root.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:2147483646;font-family:system-ui,-apple-system,sans-serif;";

  var btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("aria-label", "Abrir chat");
  btn.style.cssText =
    "width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,.2);color:#fff;font-size:22px;display:flex;align-items:center;justify-content:center;";

  var panel = document.createElement("div");
  panel.style.cssText =
    "display:none;position:absolute;bottom:68px;right:0;width:340px;max-width:calc(100vw - 32px);height:420px;background:#fff;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.18);overflow:hidden;flex-direction:column;";

  var header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;gap:10px;padding:12px 14px;color:#fff;";

  var avatar = document.createElement("div");
  avatar.style.cssText =
    "width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;overflow:hidden;";

  var title = document.createElement("span");
  title.style.cssText = "font-weight:600;font-size:15px;flex:1;";

  var closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "✕";
  closeBtn.style.cssText = "background:transparent;border:none;color:#fff;cursor:pointer;font-size:16px;opacity:.9;";

  var messages = document.createElement("div");
  messages.style.cssText = "flex:1;overflow-y:auto;padding:12px;background:#f8fafc;";

  var inputRow = document.createElement("div");
  inputRow.style.cssText = "display:flex;gap:8px;padding:10px;border-top:1px solid #e2e8f0;background:#fff;";

  var input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Escribe tu mensaje…";
  input.style.cssText =
    "flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;font-size:14px;outline:none;";

  var sendBtn = document.createElement("button");
  sendBtn.type = "button";
  sendBtn.textContent = "Enviar";
  sendBtn.style.cssText =
    "border:none;border-radius:8px;padding:8px 14px;color:#fff;cursor:pointer;font-size:13px;font-weight:600;";

  function applyTheme() {
    var color = (config && config.color_primario) || "#6366f1";
    btn.style.background = color;
    header.style.background = color;
    sendBtn.style.background = color;
    title.textContent = (config && config.nombre) || "Chat";
    var av = config && config.avatar_url;
    if (av) {
      avatar.innerHTML = '<img src="' + av + '" alt="" style="width:100%;height:100%;object-fit:cover"/>';
    } else {
      avatar.textContent = (title.textContent || "C").charAt(0).toUpperCase();
    }
  }

  function addBubble(text, fromBot) {
    var wrap = document.createElement("div");
    wrap.style.cssText = "margin-bottom:8px;display:flex;" + (fromBot ? "" : "justify-content:flex-end;");
    var bubble = document.createElement("div");
    bubble.style.cssText =
      "max-width:85%;padding:8px 12px;border-radius:12px;font-size:14px;line-height:1.4;" +
      (fromBot
        ? "background:#fff;border:1px solid #e2e8f0;color:#1e293b;border-bottom-left-radius:4px;"
        : "background:#6366f1;color:#fff;border-bottom-right-radius:4px;");
    if (!fromBot && config && config.color_primario) {
      bubble.style.background = config.color_primario;
    }
    bubble.textContent = text;
    wrap.appendChild(bubble);
    messages.appendChild(wrap);
    messages.scrollTop = messages.scrollHeight;
  }

  function togglePanel(show) {
    open = show;
    panel.style.display = show ? "flex" : "none";
    btn.textContent = show ? "✕" : "💬";
    if (show && messages.childElementCount === 0 && config && config.mensaje_bienvenida) {
      addBubble(config.mensaje_bienvenida, true);
    }
  }

  function sendMessage() {
    var text = (input.value || "").trim();
    if (!text || sending || !config) return;
    sending = true;
    input.value = "";
    addBubble(text, false);

    fetch(apiOrigin + "/api/chatbot/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embed_token: token,
        session_id: sessionId,
        message: text,
        visitor_info: {},
      }),
    })
      .then(function (r) {
        return r.json().then(function (d) {
          if (!r.ok) throw new Error(d.detail || "Error");
          return d;
        });
      })
      .then(function (data) {
        if (data.session_id) sessionId = data.session_id;
        addBubble(data.reply || "…", true);
      })
      .catch(function () {
        addBubble("No pudimos enviar tu mensaje. Inténtalo de nuevo.", true);
      })
      .finally(function () {
        sending = false;
      });
  }

  btn.addEventListener("click", function () {
    togglePanel(!open);
  });
  closeBtn.addEventListener("click", function () {
    togglePanel(false);
  });
  sendBtn.addEventListener("click", sendMessage);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") sendMessage();
  });

  header.appendChild(avatar);
  header.appendChild(title);
  header.appendChild(closeBtn);
  inputRow.appendChild(input);
  inputRow.appendChild(sendBtn);
  panel.appendChild(header);
  panel.appendChild(messages);
  panel.appendChild(inputRow);
  root.appendChild(panel);
  root.appendChild(btn);

  fetch(apiOrigin + "/api/chatbot/widget/" + encodeURIComponent(token))
    .then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) throw new Error(d.detail || "Config error");
        return d;
      });
    })
    .then(function (cfg) {
      config = cfg;
      applyTheme();
      document.body.appendChild(root);
    })
    .catch(function (err) {
      console.warn("[NELVYON Chatbot]", err);
    });
})();
