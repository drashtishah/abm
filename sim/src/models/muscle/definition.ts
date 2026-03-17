/** Model registration for Muscle Development — exercise physiology ABM. */
import type { ModelDefinition } from '../../framework/model-registry.js';
import { registerModel } from '../../framework/model-registry.js';
import { MuscleWorld } from './world.js';

export const muscleDef: ModelDefinition = {
  id: 'muscle',
  name: 'Muscle Development',
  description: 'How training, rest, and genetics shape muscle growth through hormonal balance',
  context: `Each circle is a muscle fiber. Bigger and darker = stronger. The grid background shows hormones: {color:1} = anabolic (building), {color:2} = catabolic (breakdown). Each tick = one day.

Agent rules:
• Muscle fibers (circles) each have a genetic max size set by % slow twitch.
• Daily activity adds both hormones. Lifting weights adds a big surge.
• Sleep clears hormones — catabolic clears slightly faster, giving anabolic the edge.
• Fibers grow when anabolic exceeds catabolic. Watch circles get bigger and darker.
• Hormones diffuse to neighbors and stay within physiological bounds.

These rules produce emergent equilibrium:

Muscle mass rises then plateaus. Grid shifts toward {color:1} as anabolic builds up. Overtrain (too frequent, too little sleep) and {color:2} takes over — gains stall.`,
  credit: 'Based on <a href="https://ccl.northwestern.edu/netlogo/models/MuscleDevelopment" target="_blank">NetLogo Muscle Development</a> by Scott Styles & Uri Wilensky (2002). Center for Connected Learning and Computer-Based Modeling, Northwestern University, Evanston, IL.',
  defaultConfig: {
    width: 800,
    height: 600,
    gridSize: 33,
    intensity: 95,
    hoursOfSleep: 8,
    daysBetweenWorkouts: 5,
    slowTwitchPercent: 50,
    lift: 1,
    seed: 0,
  },
  configSchema: [
    { key: 'width', label: 'Width', min: 400, max: 1200, step: 100, default: 800, tier: 'hidden' },
    { key: 'height', label: 'Height', min: 300, max: 900, step: 100, default: 600, tier: 'hidden' },
    { key: 'gridSize', label: 'Grid Size', min: 10, max: 50, step: 1, default: 33, tier: 'hidden' },
    {
      key: 'intensity',
      label: 'Intensity',
      min: 0,
      max: 100,
      step: 1,
      default: 95,
      info: 'How hard each workout is\nHigh → more muscle fibers work, bigger hormone surge\nLow → fewer fibers activated, gentler stimulus',
      tier: 'core',
    }, /* NetLogo default: 95 */
    {
      key: 'hoursOfSleep',
      label: 'Hours of Sleep',
      min: 0,
      max: 12,
      step: 0.5,
      default: 8,
      info: 'Sleep hours per night\nHigh → body clears breakdown hormones faster, better recovery\nLow → poor recovery, growth stalls',
      tier: 'core',
    }, /* NetLogo default: 8 */
    {
      key: 'daysBetweenWorkouts',
      label: 'Days Between Workouts',
      min: 1,
      max: 30,
      step: 1,
      default: 5,
      info: 'Days of rest between gym sessions\nHigh → full recovery but fewer workouts\nLow → more workouts but risk of overtraining',
      tier: 'core',
    }, /* NetLogo default: 5 */
    {
      key: 'slowTwitchPercent',
      label: '% Slow Twitch Fibers',
      min: 0,
      max: 100,
      step: 1,
      default: 50,
      info: 'Genetic muscle composition (set at setup, press Setup to apply)\nHigh → endurance build, smaller max size per fiber\nLow → strength build, larger max size per fiber',
      tier: 'core',
    }, /* NetLogo default: 50 */
    { key: 'seed', label: 'Random Seed', min: 0, max: 99999, step: 1, default: 0, info: 'Seed for reproducible runs. 0 = random each time.', tier: 'hidden' },
  ],
  agentTypes: [
    { type: 'fiber', color: '#cc0000', radius: 4, shape: 'circle' },
  ],
  populationDisplay: [
    { key: 'muscleMass', label: 'Muscle Mass', color: '#ff4444' },
    { key: 'avgAnabolic', label: 'Avg Anabolic', color: '#44cc44' },
    { key: 'avgCatabolic', label: 'Avg Catabolic', color: '#cccc44' },
  ],
  toggles: [
    { key: 'lift', label: 'Lift Weights', default: true, info: 'Enable gym workouts\nOn → regular hormone surges drive muscle growth\nOff → no training, minimal change' },
  ],
  expectedPattern: {
    type: 'equilibrium',
    description: 'Muscle mass grows with training and plateaus as fibers approach their genetic maximum',
    minTicks: 500,
    populations: ['muscleMass'],
    stabilizeByTick: 400,
    maxVariance: 2,
  },
  challengeText: 'Can you find the optimal training schedule that maximizes muscle growth without overtraining?',
  chartYLabel: 'Muscle Mass',
  patchColorKeys: { high: 'avgAnabolic', low: 'avgCatabolic' },
  patternSvg: '<svg viewBox="0 0 200 45" style="width:100%;height:40px;display:block"><path d="M5,40 Q30,37 55,30 Q80,20 105,14 Q130,10 155,9 Q175,9 195,9" stroke="#ff4444" fill="none" stroke-width="1.5" opacity="0.8"/><path d="M5,22 L15,12 25,18 35,10 45,16 55,8 65,14 75,7 85,13 95,6 105,12 115,6 125,11 135,6 145,10 155,6 165,10 175,6 185,10 195,6" stroke="#44cc44" fill="none" stroke-width="1" opacity="0.5"/><path d="M5,30 L15,22 25,27 35,20 45,25 55,18 65,23 75,17 85,22 95,16 105,21 115,16 125,20 135,16 145,20 155,16 165,20 175,16 185,20 195,16" stroke="#cccc44" fill="none" stroke-width="1" opacity="0.5"/></svg>',
  createWorld: (config: Record<string, number>) => new MuscleWorld(config),
};

registerModel(muscleDef);
