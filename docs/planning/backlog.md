# PLAN-002 Portfolio Management

## Vision
The Planning app shall allow for capturing new ideas for projects or initiatives (can be from small maintenance changes to large multi-stage projects) via simple form, process (where reasonable enrich) them and prepare them for decision-making steps (do/discard, go/no-go decisions, prioritizations, budget allocation etc.).
We're intending to implement a process framework providing guidance where reasonable while avoiding linear process flows.

## Functional Details

### Backlog principles
- The backlog is always considered being ONE unit - no distincion between project types (maintenance and projects)
- We want to prioritize all work items as equal (business changes shall not be prioritized over technical items)

### Guidance vs. flexibility

#### Captured data & automated calculations

- We want to capture base data, not "fluff" - one core decision parameter is WSJF; what's to be captured are human-understandable values allowing for comparison (using sliders for certainty & risk values)
- When determining Fibonacci-values used for WSJF, we always use all items in the backlog, take the base values they contain, compare the items with each other, and determine reasonable Fibonacci values
- WSJF is dynamic, it may change as the backlog changes

#### UI simplicity

- We want to capture ONLY RELEVANT information per step

#### Data model extensibility

- Additional fields per customer (tenant) shall be allowed

#### Process extensibility

- We want to be able to define automations (calculations, automated status transitions, notifications, information requests)

#### Process agility

- The process backlog items take shall be 

## Technical requirements

### General

- Use existing functionality of our platform (Shared Kernel, Authorization, Services, Automation Engine)

### WSJF calculation

- Event-based logic that runs upon every change of a backlog item

### Permission model

- Prepare for using a permission model using the Shared Kernel's authorization feature