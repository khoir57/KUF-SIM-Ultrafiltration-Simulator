export enum MoleculeType {
  SOLVENT = 'SOLVENT',
  SALT = 'SALT',
  VIRUS = 'VIRUS',
  COLLOID = 'COLLOID',
  BACTERIA = 'BACTERIA'
}

export type FiltrationMode = 'DEAD_END' | 'CROSS_FLOW';
export type TimeUnit = 'min' | 'hour';

// Hermia's model classifications
export type HermiaMechanism = 0 | 1 | 1.5 | 2;

export interface Particle {
  id: number;
  type: MoleculeType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  passed: boolean;
  stuckTime: number; 
}

export interface SimulationState {
  tmp: number; // Trans-Membrane Pressure in kPa
  poreSize: number; // in nm
  permeability: number; // in L/m2/h/bar
  mode: FiltrationMode;
  isRunning: boolean;
  flux: number; // Current J in LMH
  initialFlux: number; // J0
  rejectionRate: number;
  foulingFactor: number; // Derived from J/J0
  timeUnit: TimeUnit;
  crossFlowVelocity: number; 
  // Hermia Parameters
  nValue: HermiaMechanism;
  kConstant: number;
  steadyStateFlux: number; // Jss
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}