/** Nelvyon Zapier app — triggers and actions via Public API v1/v2 */
module.exports = {
  version: require("./package.json").version,
  platformVersion: "15.0.0",
  authentication: {
    type: "custom",
    fields: [{ key: "apiKey", label: "API Key (nlv_…)", required: true, type: "string" }],
    test: {
      url: "https://nelvyon.com/api/public/v1/contacts",
      headers: { Authorization: "Bearer {{bundle.authData.apiKey}}" },
    },
  },
  triggers: {
    new_contact: {
      key: "new_contact",
      noun: "Contact",
      display: { label: "New CRM Contact", description: "Fires when a contact is created" },
      operation: {
        perform: {
          url: "https://nelvyon.com/api/public/v1/contacts",
          headers: { Authorization: "Bearer {{bundle.authData.apiKey}}" },
        },
      },
    },
  },
  creates: {
    create_contact: {
      key: "create_contact",
      noun: "Contact",
      display: { label: "Create Contact", description: "Create a CRM contact" },
      operation: {
        inputFields: [
          { key: "email", required: true, type: "string" },
          { key: "name", required: false, type: "string" },
        ],
        perform: {
          url: "https://nelvyon.com/api/public/v1/contacts",
          method: "POST",
          headers: { Authorization: "Bearer {{bundle.authData.apiKey}}" },
          body: { email: "{{bundle.inputData.email}}", name: "{{bundle.inputData.name}}" },
        },
      },
    },
    trigger_workflow: {
      key: "trigger_workflow",
      noun: "Workflow",
      display: { label: "Trigger Workflow", description: "Run a SaaS workflow" },
      operation: {
        inputFields: [{ key: "workflowId", required: true, type: "string" }],
        perform: {
          url: "https://nelvyon.com/api/public/v1/workflows/trigger",
          method: "POST",
          headers: { Authorization: "Bearer {{bundle.authData.apiKey}}" },
          body: { workflow_id: "{{bundle.inputData.workflowId}}" },
        },
      },
    },
  },
};
