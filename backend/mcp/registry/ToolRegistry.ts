import type { McpRegisteredTool, McpToolDef } from "../types";

export class ToolRegistry {
  private readonly tools = new Map<string, McpRegisteredTool>();

  register(tool: McpRegisteredTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`duplicate_tool:${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): McpRegisteredTool | undefined {
    return this.tools.get(name);
  }

  list(): McpToolDef[] {
    return [...this.tools.values()].map(({ handler: _h, ...def }) => def);
  }

  listByCategory(category: string): McpToolDef[] {
    return this.list().filter((t) => t.category === category);
  }

  count(): number {
    return this.tools.size;
  }

  clear(): void {
    this.tools.clear();
  }
}

let _registry: ToolRegistry | undefined;
export function getToolRegistry(): ToolRegistry {
  _registry ??= new ToolRegistry();
  return _registry;
}
export function resetToolRegistryForTests(): void {
  _registry = undefined;
}
