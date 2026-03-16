# ABM Model Catalog

Curated list of agent-based models with feasibility notes against the ABM simulator framework. Models are rated by implementation complexity relative to the existing `Agent` + `BaseWorld` interfaces.

---

## Spatial / Grid Models

### Schelling Segregation
- **Concept**: Agents on a grid move when too few neighbors share their type — mild individual preferences produce strong macro-level segregation
- **Agent types**: 2+ demographic groups + empty cells
- **Key params**: tolerance threshold, grid density, number of groups
- **Feasibility**: High — straightforward grid, simple move-if-unhappy rule. `meta.group` for type, `alive` for empty cells
- **Complexity**: Low

### Game of Life (Conway)
- **Concept**: Cellular automaton — cells live/die based on neighbor count
- **Agent types**: Cell (alive/dead)
- **Key params**: grid size, initial density, rule variant (B3/S23 standard)
- **Feasibility**: High — technically not ABM but fits the framework. Each cell is an agent, `alive` flag toggles
- **Complexity**: Low

### Forest Fire
- **Concept**: Trees grow, catch fire from neighbors, burn out — models percolation and spread dynamics
- **Agent types**: Empty, Tree, Burning
- **Key params**: growth probability, lightning probability, grid size
- **Feasibility**: High — state machine per cell, pure behavior functions
- **Complexity**: Low

---

## Flocking / Movement Models

### Boids (Reynolds Flocking)
- **Concept**: Agents follow 3 local rules (separation, alignment, cohesion) producing realistic flocking
- **Agent types**: Boid (optionally predator + prey variants)
- **Key params**: separation distance, alignment weight, cohesion weight, max speed, visual range
- **Feasibility**: High — continuous space, `vx`/`vy` already on Agent, pure vector math behaviors
- **Complexity**: Medium (vector math, spatial queries for neighbors)

### Ant Colony / Foraging
- **Concept**: Ants search for food, deposit pheromones, others follow trails — emergent path optimization
- **Agent types**: Ant, Food, Nest, Pheromone
- **Key params**: pheromone decay rate, diffusion rate, ant count, food patches
- **Feasibility**: Medium — needs pheromone grid as `extraState` on world. Agents move on continuous space but read/write a grid overlay
- **Complexity**: Medium-High (pheromone diffusion step, two-layer state)

---

## Epidemiological Models

### SIR Epidemic
- **Concept**: Susceptible → Infected → Recovered disease spread through contact
- **Agent types**: Person (S/I/R state)
- **Key params**: infection radius, infection probability, recovery time, population, initial infected
- **Feasibility**: High — `meta.state` for SIR, proximity-based infection, timer for recovery
- **Complexity**: Low-Medium

### SEIR with Vaccination
- **Concept**: Extended SIR with Exposed (latent) period and vaccination dynamics
- **Agent types**: Person (S/E/I/R/V states)
- **Key params**: incubation period, vaccination rate, vaccine efficacy, plus SIR params
- **Feasibility**: High — same as SIR with more states in `meta`
- **Complexity**: Medium

---

## Economic / Social Models

### Sugarscape
- **Concept**: Agents harvest and consume sugar on a landscape — models wealth inequality, trade, pollution
- **Agent types**: Agent (with metabolism, vision, sugar reserve), Sugar patch
- **Key params**: metabolism range, vision range, sugar regrowth rate, initial population
- **Feasibility**: Medium — needs sugar grid as `extraState`, agents have multiple numeric properties in `meta`
- **Complexity**: Medium-High

### El Farol Bar Problem
- **Concept**: Agents decide weekly whether to attend a bar — models bounded rationality and minority games
- **Agent types**: Person (with strategy history)
- **Key params**: threshold (comfortable attendance), number of strategies, memory length
- **Feasibility**: Medium — non-spatial (agents don't move), so canvas rendering is just for visualization. May need `extraState` for global attendance history
- **Complexity**: Medium

---

## Legend

| Feasibility | Meaning |
|-------------|---------|
| **High** | Fits current `Agent` + `BaseWorld` interfaces with no changes |
| **Medium** | Needs `extraState` or `meta` usage, but no interface changes |
| **Low** | Would require framework extensions (new interfaces, base class changes) |
