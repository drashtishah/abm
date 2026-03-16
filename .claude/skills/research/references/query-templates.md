# ABM Research Query Templates

Domain-specific query templates for nlm notebook queries when researching agent-based models. These replace nlm's generic Layer 2 queries.

---

## Layer 1 — Broad Understanding (1-2 queries)

Use nlm defaults. Suggested phrasing for ABM context:

```
"Provide an overview of {model name} as an agent-based model. Who created it, when, and what was it designed to demonstrate? Cite specific sources."
```

```
"What is the current state of research on {model name}? Key publications, implementations, and how it's used in education and research today?"
```

---

## Layer 2 — ABM-Specific Dimensions (pick 3-5)

### Agent Rules
```
"What are the individual agent decision rules in {model name}? How do agents perceive their local environment and choose their next action? Describe the step-by-step behavior algorithm."
```

### Emergent Behavior
```
"What emergent phenomena arise from {model name}? How do simple micro-level agent rules produce complex macro-level patterns? What are the characteristic signatures of emergence in this model?"
```

### Parameter Sensitivity
```
"Which parameters most strongly affect outcomes in {model name}? What are typical parameter ranges used in the literature? Are there critical thresholds or phase transitions?"
```

### Spatial Dynamics
```
"How does space and topology affect {model name}? Grid vs. continuous space, neighborhood definitions (Moore, von Neumann, radius-based), boundary conditions (wrap, bounded, infinite). Which choices are standard?"
```

### Real-World Validation
```
"How has {model name} been validated against real-world data? What empirical phenomena does it successfully reproduce? What are its known limitations or unrealistic assumptions?"
```

### Extensions and Variations
```
"What notable extensions or variations of {model name} exist in the literature? How have researchers adapted the base model for different domains or added complexity?"
```

### Implementation Patterns
```
"What are common implementation approaches for {model name}? Data structures, spatial indexing, performance considerations for large populations? Any reference implementations in NetLogo, Mesa, or similar platforms?"
```

---

## Layer 3 — Synthesis (1-2 queries)

Use nlm defaults. Suggested phrasing:

```
"What patterns or contradictions emerge across these sources about {model name}? Where do researchers agree and disagree about agent rules, parameter choices, or interpretation of results?"
```

```
"What are the key unknowns or open research questions about {model name}? What aspects are poorly understood or actively debated?"
```

---

## Usage Notes

- Not all dimensions apply to every model — use judgment based on Layer 1 results
- For well-studied models (Schelling, boids, SIR), focus on implementation patterns and parameter sensitivity
- For novel or obscure models, focus on agent rules and emergent behavior
- Always include the "cite specific sources" suffix to keep responses grounded
