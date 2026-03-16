import type { World } from './types.js';

export interface ConfigField {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  info?: string;
}

export interface AgentTypeDefinition {
  type: string;
  color: string;
  radius: number;
  shape: 'circle' | 'triangle' | 'square';
}

export interface ToggleField {
  key: string;
  label: string;
  default: boolean;
}

export interface ModelDefinition {
  id: string;
  name: string;
  description: string;
  context: string;
  credit?: string;
  defaultConfig: Record<string, number>;
  configSchema: ConfigField[];
  agentTypes: AgentTypeDefinition[];
  toggles?: ToggleField[];
  createWorld(config: Record<string, number>): World;
}

const models = new Map<string, ModelDefinition>();

export function registerModel(def: ModelDefinition): void {
  models.set(def.id, def);
}

export function getModel(id: string): ModelDefinition | undefined {
  return models.get(id);
}

export function listModels(): ModelDefinition[] {
  return Array.from(models.values());
}
