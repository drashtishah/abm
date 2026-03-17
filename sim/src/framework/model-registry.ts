import type { World, ExpectedPattern } from './types.js';

export interface ConfigField {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  info?: string;
  tier?: 'core' | 'advanced' | 'hidden';
}

export interface AgentTypeDefinition {
  type: string;
  color: string;
  radius: number;
  shape: 'circle' | 'triangle' | 'square';
}

export interface PopulationDisplayEntry {
  key: string;
  label: string;
  color: string;
  showInChart?: boolean;
}

export interface ToggleField {
  key: string;
  label: string;
  default: boolean;
  info?: string;
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
  populationDisplay?: PopulationDisplayEntry[];
  toggles?: ToggleField[];
  expectedPattern?: ExpectedPattern;
  challengeText?: string;
  patternSvg?: string;
  chartYLabel?: string;
  /** Map grid cell colors to populationDisplay keys (high=bright, low=dim). */
  patchColorKeys?: { high: string; low: string };
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

// Returns populationDisplay entries, falling back to agentTypes if not defined.
export function getPopulationDisplay(model: ModelDefinition): PopulationDisplayEntry[] {
  if (model.populationDisplay) return model.populationDisplay;
  return model.agentTypes.map(at => ({ key: at.type, label: at.type, color: at.color }));
}
