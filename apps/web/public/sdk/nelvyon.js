/*! Nelvyon Public API SDK v1 — zero dependencies */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NelvyonSDK = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function NelvyonSDK(opts) {
    if (!opts || !opts.apiKey) throw new Error("apiKey is required");
    this.apiKey = opts.apiKey;
    this.workspaceId = opts.workspaceId || null;
    this.baseUrl = (opts.baseUrl || "").replace(/\/$/, "") || "";
  }

  NelvyonSDK.prototype._request = function (method, path, body) {
    var url = this.baseUrl + "/api/public/v1" + path;
    var headers = { "Content-Type": "application/json", "X-API-Key": this.apiKey };
    if (this.workspaceId) headers["X-Workspace-Id"] = String(this.workspaceId);
    return fetch(url, {
      method: method,
      headers: headers,
      body: body != null ? JSON.stringify(body) : undefined,
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          var err = new Error((data && data.detail) || res.statusText);
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  };

  return function (opts) {
    var sdk = new NelvyonSDK(opts);
    sdk.contacts = {
      create: function (payload) { return sdk._request("POST", "/contacts", payload); },
      list: function (params) {
        var q = params ? "?" + new URLSearchParams(params).toString() : "";
        return sdk._request("GET", "/contacts" + q);
      },
    };
    sdk.campaigns = {
      send: function (campaignId) {
        return sdk._request("POST", "/campaigns/send", { campaign_id: campaignId });
      },
    };
    sdk.chatbot = {
      message: function (payload) { return sdk._request("POST", "/chatbot/message", payload); },
    };
    sdk.forms = {
      submit: function (formId, responses, visitorInfo) {
        return sdk._request("POST", "/forms/submit", {
          form_id: formId,
          responses: responses || {},
          visitor_info: visitorInfo || {},
        });
      },
    };
    sdk.events = {
      track: function (event, properties) {
        return sdk._request("POST", "/events", { event: event, properties: properties || {} });
      },
    };
    sdk.analytics = {
      summary: function () { return sdk._request("GET", "/analytics/summary"); },
    };
    sdk.workflows = {
      trigger: function (triggerType, triggerData) {
        return sdk._request("POST", "/workflows/trigger", {
          trigger_type: triggerType,
          trigger_data: triggerData || {},
        });
      },
    };
    return sdk;
  };
});
