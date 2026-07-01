document.getElementById("save")?.addEventListener("click", async () => {
  const email = (document.getElementById("email")).value.trim();
  const name = (document.getElementById("name")).value.trim();
  const msg = document.getElementById("msg");
  if (!email) {
    msg.textContent = "Email requerido";
    return;
  }
  const { apiKey, baseUrl } = await chrome.storage.sync.get(["apiKey", "baseUrl"]);
  const url = (baseUrl || "https://nelvyon.com") + "/api/public/v1/contacts";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + (apiKey || ""),
    },
    body: JSON.stringify({ email, name }),
  });
  msg.textContent = res.ok ? "Lead enviado ✓" : "Error — configura API key en opciones";
});
