export const dict: Record<string, string> = {
  // llm.ts — tool description shown to the model when generating objects.
  "llm.generate_object.description": "Return the structured result by calling this tool.",
  "llm.error.http_transport_failed": "HTTP transport failed",
  "llm.error.invalid_ws_url": "Invalid WebSocket URL",
  "llm.error.ws_construct_failed": "Failed to construct WebSocket",
  "llm.error.ws_send_failed": "Failed to send WebSocket message",
  "llm.error.cloudflareaigateway_configure_requires_accountid_u": "CloudflareAIGateway.configure requires accountId unless baseURL is supplied",
  "llm.error.cloudflareworkersai_configure_requires_accountid_u": "CloudflareWorkersAI.configure requires accountId unless baseURL is supplied",
  "llm.llm.generateobject-model-did-not-call-the-forced-tool": "generateObject: model did not call the forced \\`{{GENERATE_OBJECT_TOOL_NAME}}\\` tool",
  "llm.llm.generateobject-tool-input-failed-schema-decode": "generateObject: tool input failed schema decode: {{message}}",
  "llm.tool_runtime.invalid-tool-input": "Invalid tool input: {{message}}",
  "llm.tool_runtime.tool-returned-an-invalid-value-for-its-success-schema": "Tool returned an invalid value for its success schema: {{message}}",
  "llm.auth.failed-to-resolve-auth-config": "Failed to resolve auth config: {{message}}",
  "llm.client.route-model-requires-a-provider": "Route.model({{id}}) requires a provider",
  "llm.client.route-model-requires-an-endpoint-baseurl-configure-it-on-the": "Route.model({{id}}) requires an endpoint baseURL — configure it on the route first",
  "llm.websocket.unsupported-websocket-url-protocol": "Unsupported WebSocket URL protocol {{protocol}}",
}
