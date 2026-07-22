export function isOllamaInferenceFailure(message: string): boolean {
  return /ollama_|model_warmup|Ollama chat|ollama_circuit_open/i.test(message);
}

export function isTaskCancelled(message: string): boolean {
  return message === "task_cancelled";
}
