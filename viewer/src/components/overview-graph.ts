interface RawElement {
  data: {
    id: string;
    label: string;
    isModule?: boolean;
    kind?: string;
    parent?: string;
    source?: string;
    target?: string;
  };
}

interface FlowEntry {
  title: string;
  path: string;
  module: string;
  moduleIds: string[];
  nodeIds: string[];
  edges: { from: string; to: string }[];
  startNodeId: string;
  continuesInto: { title: string; path: string }[];
}

interface OverviewGraphData {
  elements: RawElement[];
  flows: Record<string, { title: string; path: string }[]>;
  flowList: FlowEntry[];
}

interface ChildNode {
  id: string;
  label: string;
  kind: string;
  parent: string;
}

interface Edge {
  source: string;
  target: string;
  label: string;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Plain DOM/SVG instead of a graph library: the actual layout need here -
// a grid of module boxes that expand in place to reveal a handful of real
// nodes, plus lines between related boxes - is simple enough that CSS
// grid/flexbox already guarantees no overlap for free, and a hand-measured
// SVG overlay draws the connecting lines. No force-directed layout, no
// canvas hit-testing, no third-party layout scheduler fighting our own
// positioning (see the cytoscape-expand-collapse investigation this
// replaced: its layoutBy kept asynchronously overwriting a deterministic
// grid we'd already computed).
export function initOverviewGraph(container: HTMLElement): void {
  const wrappers = container.querySelectorAll<HTMLElement>(
    ".overview-graph-wrapper:not(.overview-initialized)",
  );
  wrappers.forEach((wrapper) => {
    wrapper.classList.add("overview-initialized");
    initOne(wrapper);
  });
}

function initOne(wrapper: HTMLElement): void {
  const script = wrapper.querySelector<HTMLScriptElement>("script[data-overview-graph]");
  if (!script) return;

  let data: OverviewGraphData;
  try {
    data = JSON.parse(script.textContent || "{}");
  } catch {
    return;
  }
  script.remove();

  const moduleNodes = data.elements.filter((e) => e.data.isModule);
  const childNodes: ChildNode[] = data.elements
    .filter((e) => e.data.kind && e.data.parent)
    .map((e) => ({
      id: e.data.id,
      label: e.data.label,
      kind: e.data.kind!,
      parent: e.data.parent!,
    }));
  const edges: Edge[] = data.elements
    .filter((e) => e.data.source && e.data.target)
    .map((e) => ({ source: e.data.source!, target: e.data.target!, label: e.data.label || "" }));
  const flowList = data.flowList || [];

  const childrenByModule = new Map<string, ChildNode[]>();
  for (const child of childNodes) {
    if (!childrenByModule.has(child.parent)) childrenByModule.set(child.parent, []);
    childrenByModule.get(child.parent)!.push(child);
  }

  const moduleIds = new Set(moduleNodes.map((m) => m.data.id));
  const parentOf = new Map(childNodes.map((c) => [c.id, c.parent]));
  const ownerOf = (id: string): string | undefined => (moduleIds.has(id) ? id : parentOf.get(id));

  // Cross-module connections, aggregated for the collapsed overview - two
  // modules are "related" if any edge crosses between something owned by
  // one and something owned by the other. Edges fully inside one module
  // (both endpoints owned by the same module) are only relevant once that
  // module is expanded, handled separately per-module below.
  const moduleAdjacency = new Map<string, Set<string>>();
  for (const id of moduleIds) moduleAdjacency.set(id, new Set());
  for (const edge of edges) {
    const a = ownerOf(edge.source);
    const b = ownerOf(edge.target);
    if (!a || !b || a === b) continue;
    moduleAdjacency.get(a)!.add(b);
    moduleAdjacency.get(b)!.add(a);
  }

  // Every direct edge, keyed by node id (module or child) on both sides -
  // unlike moduleAdjacency above, this is NOT limited to cross-module
  // edges: a command/event a child node touches can be called from another
  // child in a *different* module just as easily as from one in the same
  // module, and selecting a child needs to surface both.
  const nodeAdjacency = new Map<string, Set<string>>();
  for (const id of moduleIds) nodeAdjacency.set(id, new Set());
  for (const child of childNodes) nodeAdjacency.set(child.id, new Set());
  for (const edge of edges) {
    if (!nodeAdjacency.has(edge.source) || !nodeAdjacency.has(edge.target)) continue;
    nodeAdjacency.get(edge.source)!.add(edge.target);
    nodeAdjacency.get(edge.target)!.add(edge.source);
  }

  // Grouped by originating module (flowList already arrives sorted by
  // module then title from generate-docs.mjs) instead of one flat,
  // alphabetical-by-title list - a business user scanning "which flow do I
  // want" has a much better time with ~25 short module groups than one
  // undifferentiated wall of 90+ titles.
  const flowsByModule = new Map<string, { flow: FlowEntry; index: number }[]>();
  flowList.forEach((flow, index) => {
    if (!flowsByModule.has(flow.module)) flowsByModule.set(flow.module, []);
    flowsByModule.get(flow.module)!.push({ flow, index });
  });
  const flowComboGroups = [...flowsByModule.entries()]
    .map(
      ([module, items]) => `
      <div class="overview-flow-combo-group">
        <div class="overview-flow-combo-group-label">${escapeXml(module)}</div>
        ${items
          .map(
            ({ flow, index }) =>
              `<div class="overview-flow-combo-item" data-index="${index}" role="option">${escapeXml(flow.title)}</div>`,
          )
          .join("")}
      </div>`,
    )
    .join("");

  wrapper.innerHTML = `
    <div class="overview-toolbar">
      <div class="overview-flow-combo">
        <input type="text" class="overview-flow-combo-input" placeholder="Jump to a flow…" autocomplete="off" />
        <div class="overview-flow-combo-list" hidden>${flowComboGroups}</div>
      </div>
      <button type="button" class="overview-reset-button" hidden>&times; Deselect</button>
    </div>
    <div class="overview-legend">
      <span class="overview-legend-item"><span class="overview-legend-swatch swatch-module"></span>Module</span>
      <span class="overview-legend-item"><span class="overview-legend-swatch kind-endpoint"></span>Endpoint</span>
      <span class="overview-legend-item"><span class="overview-legend-swatch kind-command"></span>Command</span>
      <span class="overview-legend-item"><span class="overview-legend-swatch kind-query"></span>Query</span>
      <span class="overview-legend-item"><span class="overview-legend-swatch kind-event"></span>Event</span>
      <span class="overview-legend-item"><span class="overview-legend-swatch swatch-start">●</span>Flow start</span>
      <span class="overview-legend-item"><span class="overview-legend-swatch swatch-origin">○</span>Produces this, not triggered elsewhere in the flow</span>
    </div>
    <div class="overview-scroll">
      <svg class="overview-edges"></svg>
      <div class="overview-grid"></div>
    </div>
    <div class="overview-flow-panel"></div>
  `;
  const grid = wrapper.querySelector<HTMLElement>(".overview-grid")!;
  const svg = wrapper.querySelector<SVGSVGElement>(".overview-edges")!;
  const panel = wrapper.querySelector<HTMLElement>(".overview-flow-panel")!;
  const resetButton = wrapper.querySelector<HTMLButtonElement>(".overview-reset-button")!;
  const flowComboInput = wrapper.querySelector<HTMLInputElement>(".overview-flow-combo-input")!;
  const flowComboList = wrapper.querySelector<HTMLElement>(".overview-flow-combo-list")!;

  // Single text field instead of a select + separate filter box - typing
  // narrows the list (by title OR module name, so "Licensing" surfaces
  // that whole group even without knowing a specific flow title in it),
  // arrow keys move a highlight among visible items, Enter or a click
  // selects one. A group with zero visible items hides too, instead of
  // showing as an empty label.
  function comboItems(): HTMLElement[] {
    return [...flowComboList.querySelectorAll<HTMLElement>(".overview-flow-combo-item")];
  }

  function filterCombo(): void {
    // Typing always reopens the list, even right after a selection closed
    // it (the input stays focused after choosing an item) - clearing back
    // to empty should show every flow again, not leave the list stuck shut.
    flowComboList.hidden = false;
    const query = flowComboInput.value.trim().toLowerCase();
    flowComboList.querySelectorAll<HTMLElement>(".overview-flow-combo-group").forEach((group) => {
      const label = group.querySelector(".overview-flow-combo-group-label")!.textContent!.toLowerCase();
      let anyVisible = false;
      group.querySelectorAll<HTMLElement>(".overview-flow-combo-item").forEach((item) => {
        const matches = !query || item.textContent!.toLowerCase().includes(query) || label.includes(query);
        item.hidden = !matches;
        if (matches) anyVisible = true;
      });
      group.hidden = !anyVisible;
    });
    clearComboHighlight();
  }

  function clearComboHighlight(): void {
    comboItems().forEach((item) => item.classList.remove("highlighted"));
  }

  function highlightComboItem(item: HTMLElement): void {
    clearComboHighlight();
    item.classList.add("highlighted");
    item.scrollIntoView({ block: "nearest" });
  }

  function chooseComboItem(item: HTMLElement): void {
    const flow = flowList[Number(item.dataset.index)];
    if (!flow) return;
    flowComboInput.value = flow.title;
    flowComboList.hidden = true;
    selectFlow(flow);
  }

  flowComboInput.addEventListener("input", filterCombo);

  flowComboInput.addEventListener("focus", () => {
    flowComboList.hidden = false;
  });

  // A blur fired by clicking an item would otherwise close the list
  // before the click's own listener gets to read what was clicked -
  // delay just long enough for that click to land first.
  flowComboInput.addEventListener("blur", () => {
    window.setTimeout(() => {
      flowComboList.hidden = true;
    }, 150);
  });

  flowComboInput.addEventListener("keydown", (e) => {
    const visible = comboItems().filter((item) => !item.hidden);
    if (visible.length === 0) return;
    const currentIdx = visible.findIndex((item) => item.classList.contains("highlighted"));

    if (e.key === "ArrowDown") {
      e.preventDefault();
      flowComboList.hidden = false;
      highlightComboItem(visible[Math.min(currentIdx + 1, visible.length - 1)]);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      flowComboList.hidden = false;
      highlightComboItem(visible[Math.max(currentIdx - 1, 0)]);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = currentIdx >= 0 ? visible[currentIdx] : visible[0];
      chooseComboItem(target);
    } else if (e.key === "Escape") {
      flowComboList.hidden = true;
      flowComboInput.blur();
    }
  });

  flowComboList.addEventListener("mousedown", (e) => {
    // mousedown (not click) fires before the input's blur, so the item is
    // still there to read when chooseComboItem runs.
    const item = (e.target as HTMLElement).closest<HTMLElement>(".overview-flow-combo-item");
    if (item) chooseComboItem(item);
  });

  for (const mod of moduleNodes) {
    const id = mod.data.id;
    const children = childrenByModule.get(id) || [];
    const box = document.createElement("div");
    box.className = "overview-module";
    box.dataset.id = id;
    box.innerHTML = `
      <div class="overview-module-header" data-id="${id}">${mod.data.label}</div>
      <div class="overview-module-children" hidden>
        ${children
          .map((c) => `<div class="overview-child kind-${c.kind}" data-id="${c.id}">${c.label}</div>`)
          .join("")}
      </div>
    `;
    grid.appendChild(box);
  }

  // `hidden` toggles are animated (fade + scale) rather than instant: hiding
  // adds a class that CSS transitions to opacity:0/scale(0.85), then the
  // element actually leaves layout (`hidden = true`) once that transition
  // finishes; showing does the reverse (un-hide first so the grid
  // allocates its space immediately, then transition in from that same
  // faded-out state).
  const TRANSITION_MS = 200;

  // Lines are only drawn while something is selected/expanded on purpose -
  // with all 26 modules visible at once (the default view), every edge in
  // the whole graph would draw simultaneously, which is unreadable noise,
  // not an overview.
  let hasSelection = false;
  // Set only while a flow is selected via the dropdown - restricts drawEdges
  // to edges actually part of *that* flow's own trace, not every edge that
  // happens to connect two modules the flow touches (which could include
  // edges from a completely different, unrelated flow between the same pair).
  let currentFlowNodeIds: Set<string> | null = null;
  // "from=>to" -> step number (1-based, in the order DiagramBuilder traced
  // this flow's dispatch chain) - only meaningful while one flow is
  // selected, since module/child selection can mix edges from several
  // unrelated flows where a single linear order wouldn't mean anything.
  let currentFlowEdgeSeq: Map<string, number> | null = null;

  function hideAnimated(el: HTMLElement): void {
    if (el.hidden || el.classList.contains("leaving")) return;
    el.classList.add("leaving");
    window.setTimeout(() => {
      el.hidden = true;
      el.classList.remove("leaving");
    }, TRANSITION_MS);
  }

  function showAnimated(el: HTMLElement): void {
    el.classList.remove("leaving");
    if (!el.hidden) return;
    el.hidden = false;
    el.classList.add("entering");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => el.classList.remove("entering"));
    });
  }

  // `collapseChildren` is true only for an actual deselect (the reset
  // button, or re-clicking an already-selected node) - a fresh new
  // selection also calls this first to wipe the *previous* state, but
  // must NOT force every module shut, since it's about to decide for
  // itself which modules should end up expanded (and the header click
  // handler may have just deliberately opened the very module being
  // clicked, right before this runs).
  function clearHighlight(collapseChildren: boolean): void {
    wrapper.querySelectorAll<HTMLElement>(".overview-module, .overview-child").forEach((el) => {
      el.classList.remove("related", "selected", "overview-flow-start", "overview-flow-origin");
      el.style.order = "";
      showAnimated(el);
    });
    if (collapseChildren) {
      wrapper.querySelectorAll<HTMLElement>(".overview-module-children").forEach((el) => {
        el.hidden = true;
      });
    }
    panel.innerHTML = "";
    resetButton.hidden = true;
    currentFlowNodeIds = null;
    currentFlowEdgeSeq = null;
    hasSelection = false;
    requestAnimationFrame(drawEdges);
    window.setTimeout(drawEdges, TRANSITION_MS);
  }

  resetButton.addEventListener("click", () => {
    flowComboInput.value = "";
    clearHighlight(true);
  });

  function showFlowsFor(id: string, label: string): void {
    const flows = data.flows[id] || [];
    panel.innerHTML = flows.length
      ? `<div class="overview-flow-panel-title">Flows involving "${label}":</div><ul>${flows
          .map((f) => `<li><a href="#/${f.path}">${f.title}</a></li>`)
          .join("")}</ul>`
      : `<div class="overview-flow-panel-title">No documented flows directly reference "${label}".</div>`;
  }

  // Instead of dimming everything not involved with the selected node in
  // place, unrelated boxes are actually hidden (`hidden`, not opacity) so
  // the CSS grid reflows tight around only what's relevant - a "compact
  // view" rather than a full grid with most of it grayed out. Every
  // related module is fully expanded too, not just marked - the point of
  // clicking is to see the actual relationship, not another collapsed box.
  function selectModule(id: string): void {
    const alreadySelected = wrapper
      .querySelector(`.overview-module[data-id="${id}"]`)
      ?.classList.contains("selected");
    flowComboInput.value = "";
    clearHighlight(Boolean(alreadySelected));
    if (alreadySelected) return;

    const related = moduleAdjacency.get(id) || new Set();
    wrapper.querySelectorAll<HTMLElement>(".overview-module").forEach((el) => {
      if (el.dataset.id === id) {
        el.classList.add("selected");
      } else if (el.dataset.id && related.has(el.dataset.id)) {
        el.classList.add("related");
        el.querySelector<HTMLElement>(".overview-module-children")!.hidden = false;
      } else {
        hideAnimated(el);
      }
    });
    const label = moduleNodes.find((m) => m.data.id === id)?.data.label || id;
    showFlowsFor(id, label);
    resetButton.hidden = false;
    hasSelection = true;
    requestAnimationFrame(drawEdges);
    window.setTimeout(drawEdges, TRANSITION_MS);
  }

  function selectChild(id: string): void {
    const alreadySelected = wrapper
      .querySelector(`.overview-child[data-id="${id}"]`)
      ?.classList.contains("selected");
    flowComboInput.value = "";
    clearHighlight(Boolean(alreadySelected));
    if (alreadySelected) return;

    // `related` can contain other child ids (same module or a different
    // one - any direct edge counts) and/or module ids directly (an edge
    // that went straight to a module rather than a specific child of it -
    // e.g. an event consumed generically by a module with no single
    // handler node tracked for it).
    const related = nodeAdjacency.get(id) || new Set();
    const relatedChildIds = new Set([...related].filter((nid) => parentOf.has(nid)));
    const relevantModuleIds = new Set(
      [id, ...related].map((nid) => ownerOf(nid)).filter(Boolean) as string[],
    );

    wrapper.querySelectorAll<HTMLElement>(".overview-child").forEach((el) => {
      if (el.dataset.id === id) el.classList.add("selected");
      else if (el.dataset.id && relatedChildIds.has(el.dataset.id)) el.classList.add("related");
      else hideAnimated(el);
    });
    // Every relevant module - the selected child's own, and any other one
    // touched by a shared edge - expands, even if the relation is only at
    // the module level with no specific child to point at.
    const homeModuleId = parentOf.get(id);
    wrapper.querySelectorAll<HTMLElement>(".overview-module").forEach((el) => {
      const modId = el.dataset.id!;
      if (!relevantModuleIds.has(modId)) {
        hideAnimated(el);
        return;
      }
      el.classList.add(modId === homeModuleId ? "selected" : "related");
      el.querySelector<HTMLElement>(".overview-module-children")!.hidden = false;
    });
    const child = childNodes.find((c) => c.id === id);
    showFlowsFor(id, child?.label || id);
    resetButton.hidden = false;
    hasSelection = true;
    requestAnimationFrame(drawEdges);
    window.setTimeout(drawEdges, TRANSITION_MS);
  }

  // Jumping to a documented flow expands every module it touches at once,
  // instead of the user having to click through them one by one to
  // reconstruct which modules are actually involved.
  // A node qualifies for the current flow only if it's directly in the
  // flow's own touched-node set. currentFlowNodeIds is populated (in
  // selectFlow) from both flow.nodeIds AND every id referenced by
  // flow.edges, so a synthetic handler node (SYN_..., only ever created
  // in the shared overview graph, never in any single flow's own raw
  // trace) is covered exactly when THIS flow's own edge list actually
  // uses it - not via an owning-module fallback. An owner-based fallback
  // was tried here before and had to be reverted: flow.nodeIds always
  // includes every module the flow touches, so "owner is in the flow"
  // was trivially true for ANY synthetic node belonging to that module,
  // including ones that actually belong to a sibling flow (e.g.
  // CreateProduct's own handler node leaking into a selected
  // DeleteProduct flow, since both touch the same ProductData module).
  function inCurrentFlow(id: string): boolean {
    if (!currentFlowNodeIds) return true;
    return currentFlowNodeIds.has(id);
  }

  // Module boxes normally sit in whatever fixed order the server listed all
  // modules in, unrelated to any one flow's own trace - a flow touching a
  // handful of far-apart modules then draws long lines that cross straight
  // through every unrelated box sitting between them. Reordering the
  // (CSS grid, so a plain `order` style is enough - no DOM move needed)
  // visible boxes to match the sequence flow.edges actually walks puts
  // consecutively-connected modules next to each other, so most lines only
  // need to span one neighboring box instead of the whole grid.
  function moduleOrderForFlow(flow: FlowEntry): Map<string, number> {
    const order = new Map<string, number>();
    let next = 0;
    const startModule = ownerOf(flow.startNodeId);
    if (startModule) order.set(startModule, next++);
    for (const e of flow.edges) {
      for (const nodeId of [e.from, e.to]) {
        const owner = ownerOf(nodeId);
        if (owner && !order.has(owner)) order.set(owner, next++);
      }
    }
    for (const modId of flow.moduleIds) {
      if (!order.has(modId)) order.set(modId, next++);
    }
    return order;
  }

  function selectFlow(flow: FlowEntry): void {
    // clearHighlight resets the selection state (related/selected classes,
    // expand state) but must not touch flowComboInput.value - chooseComboItem
    // already set it to this flow's own title before calling here, and
    // clearHighlight is shared with the node-click paths, which is exactly
    // the state this flow selection should visibly stick in the combobox
    // instead of reverting.
    clearHighlight(true);
    const inFlow = new Set(flow.moduleIds);
    // Must be set before the module loop below - showing/hiding individual
    // children within an expanded module relies on inCurrentFlow(), which
    // reads this closure variable, not flow.nodeIds directly. Also folds in
    // every id referenced by flow.edges: a synthetic handler node (SYN_...)
    // never appears in flow.nodeIds (that's the pre-rewrite, pre-synthesis
    // node set), only in the edges built via the same rewriteEdges() scheme
    // as the shared graph - without this, inCurrentFlow's owner-module
    // fallback for SYN_ ids would trivially pass for ANY synthetic node
    // owned by a module this flow touches, including ones that actually
    // belong to a completely different sibling flow (e.g. CreateProduct's
    // own handler node leaking into a selected DeleteProduct flow, since
    // both touch the same ProductData module).
    const edgeNodeIds = flow.edges.flatMap((e) => [e.from, e.to]);
    currentFlowNodeIds = new Set([...flow.nodeIds, ...edgeNodeIds]);
    const moduleOrder = moduleOrderForFlow(flow);
    wrapper.querySelectorAll<HTMLElement>(".overview-module").forEach((el) => {
      const modId = el.dataset.id!;
      if (!inFlow.has(modId)) {
        hideAnimated(el);
        return;
      }
      el.classList.add("related");
      el.style.order = String(moduleOrder.get(modId) ?? 0);
      const childrenContainer = el.querySelector<HTMLElement>(".overview-module-children")!;
      childrenContainer.hidden = false;
      // A module the flow touches can still own children this flow never
      // reaches (e.g. sibling CRUD commands on the same module) - only the
      // ones actually part of the flow's own traced chain should show.
      childrenContainer.querySelectorAll<HTMLElement>(".overview-child").forEach((child) => {
        child.hidden = !inCurrentFlow(child.dataset.id!);
      });
    });
    // A flow's own trace can dead-end at a node another, separately-
    // generated flow also picks up from (hop budget, or a module handoff
    // with no single onward node) - continuesInto (computed server-side in
    // generate-docs.mjs) links to those so the two don't read as
    // unrelated dead ends.
    const continuesIntoHtml =
      flow.continuesInto.length > 0
        ? `<div class="overview-flow-panel-title">Continues into:</div><ul>${flow.continuesInto
            .map((f) => `<li><a href="#/${f.path}">${escapeXml(f.title)}</a></li>`)
            .join("")}</ul>`
        : "";
    panel.innerHTML = `<div class="overview-flow-panel-title">Flow: "${escapeXml(flow.title)}"</div><ul><li><a href="#/${flow.path}">Open the full flow page</a></li></ul>${continuesIntoHtml}`;
    resetButton.hidden = false;
    currentFlowEdgeSeq = new Map(flow.edges.map((e, i) => [`${e.from}=>${e.to}`, i + 1]));
    // Marks the entry point (the controller action itself) with a dot -
    // it might currently be a collapsed module standing in for it, or its
    // own expanded box, either is a valid element to mark.
    const startEl = wrapper.querySelector<HTMLElement>(
      `.overview-module[data-id="${flow.startNodeId}"], .overview-child[data-id="${flow.startNodeId}"]`,
    );
    startEl?.classList.add("overview-flow-start");
    // A synthetic producer node (SYN_...) only ever has an OUTGOING edge in
    // any single flow's own trace - it represents "the specific class that
    // produced this event", not something dispatched from elsewhere in the
    // chain, so having no incoming arrow is correct, not broken. Without a
    // marker that reads exactly like a disconnected/orphaned node though -
    // mark it distinctly from the actual flow start (a different symbol,
    // same idea) so it's clear this is deliberate.
    const hasIncoming = new Set(flow.edges.map((e) => e.to));
    const originIds = new Set(
      flow.edges.map((e) => e.from).filter((id) => !hasIncoming.has(id) && id !== flow.startNodeId),
    );
    for (const id of originIds) {
      const el = wrapper.querySelector<HTMLElement>(`.overview-module[data-id="${id}"], .overview-child[data-id="${id}"]`);
      el?.classList.add("overview-flow-origin");
    }
    hasSelection = true;
    requestAnimationFrame(drawEdges);
    window.setTimeout(drawEdges, TRANSITION_MS);
  }

  // Lines connect actual nodes, not modules: a child whose module is
  // currently collapsed has no box of its own on screen, so its edges
  // fall back to the module box that stands in for it; a child in an
  // *expanded* module draws to its own box directly. Returns null if
  // nothing currently visible can represent this id at all (its module is
  // itself hidden/compacted away).
  function representativeId(
    id: string,
    visibleModules: Set<string>,
    collapsedChildModule: Map<string, string>,
  ): string | null {
    if (moduleIds.has(id)) return visibleModules.has(id) ? id : null;
    const collapsedInto = collapsedChildModule.get(id);
    if (collapsedInto) return collapsedInto;
    const modId = parentOf.get(id);
    if (!modId || !visibleModules.has(modId)) return null;
    return id;
  }

  interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
  }

  // Point where the line from `from` towards `to` crosses the rectangle of
  // size w×h centered on `from` - i.e. where it leaves the box, not the
  // center. The edges layer renders above the boxes, so a line/arrowhead
  // reaching all the way to a box's center would sit on top of that box's
  // own label text; clipping to the border keeps it right at the edge.
  function edgePoint(from: Box, to: { x: number; y: number }): { x: number; y: number } {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (dx === 0 && dy === 0) return { x: from.x, y: from.y };
    const scaleX = dx !== 0 ? from.w / 2 / Math.abs(dx) : Infinity;
    const scaleY = dy !== 0 ? from.h / 2 / Math.abs(dy) : Infinity;
    const scale = Math.min(scaleX, scaleY, 1);
    return { x: from.x + dx * scale, y: from.y + dy * scale };
  }

  // Stable +1/-1 per edge key so the same pair always curves the same
  // direction across redraws, while different pairs sharing similar
  // geometry tend to bow opposite ways instead of overlapping exactly.
  function curveSign(key: string): number {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
    return h % 2 === 0 ? 1 : -1;
  }

  function drawEdges(): void {
    if (!hasSelection) {
      svg.innerHTML = "";
      return;
    }

    // Origin is the SVG's own rendered position, not the wrapper's - the
    // scroll container's padding shifts the grid's content box relative to
    // the wrapper, but not an absolutely-positioned child at top:0/left:0,
    // so using the wrapper as the coordinate baseline would silently drift
    // by that padding amount.
    const svgRect = svg.getBoundingClientRect();
    svg.setAttribute("width", String(grid.scrollWidth));
    svg.setAttribute("height", String(grid.scrollHeight));

    const boxes = new Map<string, Box>();
    const visibleModules = new Set<string>();
    const collapsedChildModule = new Map<string, string>(); // childId -> module id standing in for it

    wrapper.querySelectorAll<HTMLElement>(".overview-module:not([hidden])").forEach((el) => {
      const id = el.dataset.id!;
      visibleModules.add(id);
      const r = el.getBoundingClientRect();
      boxes.set(id, { x: r.left - svgRect.left + r.width / 2, y: r.top - svgRect.top + r.height / 2, w: r.width, h: r.height });

      const childrenEl = el.querySelector<HTMLElement>(".overview-module-children")!;
      if (childrenEl.hidden) {
        for (const child of childrenByModule.get(id) || []) collapsedChildModule.set(child.id, id);
      }
    });
    wrapper.querySelectorAll<HTMLElement>(".overview-child:not([hidden])").forEach((el) => {
      const r = el.getBoundingClientRect();
      const id = el.dataset.id!;
      boxes.set(id, { x: r.left - svgRect.left + r.width / 2, y: r.top - svgRect.top + r.height / 2, w: r.width, h: r.height });
    });

    // Multiple raw edges can resolve to the same visible pair (several
    // children collapsed into the same two module boxes) - group them so
    // one line carries a combined label instead of stacking duplicates.
    const grouped = new Map<string, { a: string; b: string; labels: Set<string>; seqs: Set<number> }>();
    for (const edge of edges) {
      if (!inCurrentFlow(edge.source) || !inCurrentFlow(edge.target)) continue;
      const a = representativeId(edge.source, visibleModules, collapsedChildModule);
      const b = representativeId(edge.target, visibleModules, collapsedChildModule);
      if (!a || !b || a === b) continue;
      if (!boxes.has(a) || !boxes.has(b)) continue;
      const key = `${a}=>${b}`;
      if (!grouped.has(key)) grouped.set(key, { a, b, labels: new Set(), seqs: new Set() });
      const group = grouped.get(key)!;
      if (edge.label) group.labels.add(edge.label);
      const seq = currentFlowEdgeSeq?.get(`${edge.source}=>${edge.target}`);
      if (seq !== undefined) group.seqs.add(seq);
    }

    const parts = [
      '<defs><marker id="overview-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" /></marker></defs>',
    ];
    for (const [key, { a, b, labels, seqs }] of grouped) {
      const boxA = boxes.get(a)!;
      const boxB = boxes.get(b)!;
      const start = edgePoint(boxA, boxB);
      const end = edgePoint(boxB, boxA);

      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const dist = Math.hypot(dx, dy) || 1;
      // Two boxes sitting almost edge-to-edge (same row, ~12px gap between
      // adjacent children) left the old flat 12px floor with barely any
      // room to clear the boxes' own ~33px height - the curve (and its
      // label, sitting right at its midpoint) cut straight across both
      // boxes' text instead of arching over them. Scale the floor up for
      // short distances specifically, tapering smoothly back to the
      // original 12px by the time boxes are far enough apart that a small
      // bow already clears them fine on its own.
      // A quadratic bezier's midpoint (where the label sits) only deviates
      // from the straight chord by HALF the control point's own offset
      // (B(0.5) = 0.25*P0 + 0.5*P1 + 0.25*P2) - so clearing a ~33px-tall
      // box by a comfortable margin needs roughly double that box height
      // in raw bow, not just the box height itself.
      const closeness = Math.max(0, 1 - dist / 80);
      const bowFloor = 12 + closeness * 48;
      const bow = Math.min(60, Math.max(bowFloor, dist * 0.15)) * curveSign(key);
      const ctrlX = (start.x + end.x) / 2 + (-dy / dist) * bow;
      const ctrlY = (start.y + end.y) / 2 + (dx / dist) * bow;

      parts.push(
        `<path d="M ${start.x} ${start.y} Q ${ctrlX} ${ctrlY} ${end.x} ${end.y}" marker-end="url(#overview-arrow)" data-edge-key="${key}" data-a="${a}" data-b="${b}" />`,
      );
      // Step number(s) only show up while one flow is selected (seqs is
      // only ever populated from currentFlowEdgeSeq); prefixed onto the
      // same label so a numbered arrow doesn't need a second text element.
      const seqPrefix = seqs.size > 0 ? `${[...seqs].sort((x, y) => x - y).join(",")}. ` : "";
      if (labels.size > 0 || seqPrefix) {
        const labelList = [...labels];
        const labelText = labelList.length > 2 ? `${labelList.slice(0, 2).join(", ")}…` : labelList.join(", ");
        const text = seqPrefix + labelText;
        // Point on the quadratic curve at t=0.5.
        const labelX = 0.25 * start.x + 0.5 * ctrlX + 0.25 * end.x;
        const labelY = 0.25 * start.y + 0.5 * ctrlY + 0.25 * end.y;
        parts.push(
          `<text x="${labelX}" y="${labelY}" class="overview-edge-label" data-edge-key="${key}">${escapeXml(text)}</text>`,
        );
      }
    }
    svg.innerHTML = parts.join("");
  }

  wrapper.addEventListener("click", (e) => {
    const childEl = (e.target as HTMLElement).closest<HTMLElement>(".overview-child");
    if (childEl?.dataset.id) {
      selectChild(childEl.dataset.id);
      return;
    }
    const headerEl = (e.target as HTMLElement).closest<HTMLElement>(".overview-module-header");
    if (headerEl?.dataset.id) {
      const box = headerEl.closest<HTMLElement>(".overview-module")!;
      const childrenEl = box.querySelector<HTMLElement>(".overview-module-children")!;
      childrenEl.hidden = !childrenEl.hidden;
      selectModule(headerEl.dataset.id);
      requestAnimationFrame(drawEdges);
      return;
    }
  });

  // Hover doesn't change what's expanded/hidden (that's click's job) - it
  // only bolds the hovered node/edge plus whatever it directly connects to,
  // and dims everything else, purely as a transient reading aid over
  // whatever's already on screen. Only meaningful once edges are actually
  // drawn (hasSelection) - in the fully-collapsed default view there's
  // nothing to trace a connection through yet.
  //
  // Deliberately reads relations off the SVG's *currently rendered* edges
  // (data-a/data-b on each path), not moduleAdjacency/nodeAdjacency - those
  // two maps are built once from the WHOLE graph, so a module hovered while
  // a single flow is selected would otherwise pull in every other module it
  // connects to anywhere in the entire system, across completely unrelated
  // flows, not just the ones actually drawn in front of the user right now.
  function relatedRepresentativeIds(rawId: string): Set<string> {
    const result = new Set<string>();
    svg.querySelectorAll<SVGElement>("path[data-edge-key]").forEach((el) => {
      const a = el.getAttribute("data-a");
      const b = el.getAttribute("data-b");
      if (a === rawId && b) result.add(b);
      else if (b === rawId && a) result.add(a);
    });
    return result;
  }

  // Module boxes never get hover-highlight/hover-dim - only individual
  // children and the connecting arrows do. A collapsed module can still be
  // the representative endpoint of a highlighted edge (relatedRepresentativeIds
  // may return a module id), but that id simply won't match anything below
  // since only `.overview-child` is queried - the box itself stays untouched.
  function applyHoverHighlight(highlightNodeIds: Set<string>, highlightEdgeKeys: Set<string>): void {
    wrapper.querySelectorAll<HTMLElement>(".overview-child").forEach((el) => {
      const id = el.dataset.id;
      const on = Boolean(id && highlightNodeIds.has(id));
      el.classList.toggle("hover-highlight", on);
      el.classList.toggle("hover-dim", !on);
    });
    svg.querySelectorAll<SVGElement>("[data-edge-key]").forEach((el) => {
      const on = highlightEdgeKeys.has(el.getAttribute("data-edge-key") || "");
      el.classList.toggle("hover-highlight", on);
      el.classList.toggle("hover-dim", !on);
    });
  }

  function clearHoverHighlight(): void {
    wrapper.querySelectorAll(".hover-highlight, .hover-dim").forEach((el) => {
      el.classList.remove("hover-highlight", "hover-dim");
    });
  }

  function hoverNode(rawId: string): void {
    if (!hasSelection) return;
    const related = relatedRepresentativeIds(rawId);
    const highlightNodeIds = new Set([rawId, ...related]);
    const edgeKeys = new Set<string>();
    for (const relId of related) {
      edgeKeys.add(`${rawId}=>${relId}`);
      edgeKeys.add(`${relId}=>${rawId}`);
    }
    applyHoverHighlight(highlightNodeIds, edgeKeys);
  }

  function hoverEdge(a: string, b: string): void {
    if (!hasSelection) return;
    applyHoverHighlight(new Set([a, b]), new Set([`${a}=>${b}`, `${b}=>${a}`]));
  }

  wrapper.addEventListener("mouseover", (e) => {
    const target = e.target as Element;
    const childEl = target.closest<HTMLElement>(".overview-child");
    if (childEl?.dataset.id) {
      hoverNode(childEl.dataset.id);
      return;
    }
    const edgeEl = target.closest("[data-edge-key]");
    if (edgeEl) {
      const a = edgeEl.getAttribute("data-a");
      const b = edgeEl.getAttribute("data-b");
      if (a && b) hoverEdge(a, b);
    }
  });

  wrapper.addEventListener("mouseout", (e) => {
    const related = (e as MouseEvent).relatedTarget as Node | null;
    if (related && wrapper.contains(related)) return;
    clearHoverHighlight();
  });

  requestAnimationFrame(drawEdges);
  window.addEventListener("resize", drawEdges);
}
