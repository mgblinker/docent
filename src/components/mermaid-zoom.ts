function findSvg(root: Element): SVGSVGElement | null {
  let svg = root.querySelector('svg');
  if (svg) return svg;
  const nodes = root.querySelectorAll('*');
  for (const node of nodes) {
    if ((node as any).shadowRoot) {
      svg = (node as any).shadowRoot.querySelector('svg');
      if (svg) return svg;
    }
  }
  return null;
}

// Mermaid's <svg> only carries a viewBox (an aspect ratio, not an intrinsic
// pixel size) plus a width="100%" attribute, so plain CSS auto-sizing just
// fills the containing block - that's what was silently shrinking wide
// diagrams down to the column width, text and all. This computes the
// scale-to-fit against the *container's* width but floors it at MIN_SCALE
// so text never shrinks past legible - a diagram that would need to go
// smaller than that to fully fit instead overflows (the container scrolls)
// only past that floor, rather than either always cramming to fit or
// always rendering at full native size regardless of how that compares to
// the available width.
const MIN_SCALE = 0.6;

function applyScaledWidth(svg: SVGSVGElement, container: HTMLElement): void {
  const viewBox = svg.getAttribute('viewBox');
  if (!viewBox) return;
  const parts = viewBox.trim().split(/\s+/).map(Number);
  if (parts.length !== 4 || !Number.isFinite(parts[2]) || parts[2] <= 0) return;
  const nativeWidth = parts[2];
  const containerWidth = container.clientWidth || container.getBoundingClientRect().width;
  if (!containerWidth) return;
  const fitScale = containerWidth / nativeWidth;
  const appliedScale = Math.min(1, Math.max(fitScale, MIN_SCALE));
  svg.style.width = `${nativeWidth * appliedScale}px`;
  svg.style.maxWidth = 'none';
}

function initZoomForDiv(div: HTMLElement): void {
  if (div.classList.contains('zoom-initialized')) return;
  div.classList.add('zoom-initialized');

  const container = document.createElement('div');
  container.className = 'mermaid-zoom-container';
  div.parentNode!.insertBefore(container, div);
  container.appendChild(div);

  div.style.transformOrigin = 'top left';
  div.style.transition = 'transform 0.2s ease-out';

  const adjustContainerToContent = () => {
    const svg = findSvg(div);
    if (!svg) return;
    applyScaledWidth(svg, container);
    const rect = svg.getBoundingClientRect();
    const padding = 10;
    if (rect.height && Number.isFinite(rect.height)) {
      container.style.height = `${Math.ceil(rect.height + padding)}px`;
    }
  };

  const svg = findSvg(div);
  if (svg) {
    requestAnimationFrame(adjustContainerToContent);
    try {
      new ResizeObserver(() => requestAnimationFrame(adjustContainerToContent)).observe(svg);
    } catch {
      globalThis.addEventListener('resize', adjustContainerToContent);
    }
  } else {
    let tries = 0;
    const poll = setInterval(() => {
      const s = findSvg(div);
      if (s || tries++ > 20) {
        clearInterval(poll);
        requestAnimationFrame(adjustContainerToContent);
        if (s) {
          try {
            new ResizeObserver(() => requestAnimationFrame(adjustContainerToContent)).observe(s);
          } catch {
            globalThis.addEventListener('resize', adjustContainerToContent);
          }
        }
      }
    }, 200);
  }

  // Zoom controls
  const controls = document.createElement('div');
  controls.className = 'mermaid-zoom-controls';
  Object.assign(controls.style, {
    position: 'absolute', top: '10px', right: '10px', zIndex: '1000',
    display: 'flex', gap: '5px', background: 'rgba(255,255,255,0.9)',
    padding: '5px', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    opacity: '0', pointerEvents: 'none', transition: 'opacity 0.18s ease-out',
  });

  const btnStyle = 'background:white;border:1px solid #ccc;border-radius:3px;padding:8px 12px;cursor:pointer;font-size:14px;font-weight:bold;';
  const makeBtn = (text: string, title: string) => {
    const btn = document.createElement('button');
    btn.innerHTML = text;
    btn.title = title;
    btn.style.cssText = btnStyle;
    return btn;
  };

  const zoomInBtn = makeBtn('+', 'Zoom In');
  const zoomOutBtn = makeBtn('−', 'Zoom Out');
  const resetBtn = makeBtn('⟲', 'Reset Zoom');
  const fullscreenBtn = makeBtn('⛶', 'Fullscreen');

  controls.append(zoomInBtn, zoomOutBtn, resetBtn, fullscreenBtn);
  container.appendChild(controls);

  let isDragging = false;
  let touchTimer: ReturnType<typeof setTimeout> | null = null;

  const showControls = () => { controls.style.opacity = '1'; controls.style.pointerEvents = 'auto'; };
  const hideControls = () => { if (isDragging) return; controls.style.opacity = '0'; controls.style.pointerEvents = 'none'; };

  container.addEventListener('mouseenter', showControls);
  container.addEventListener('mouseleave', hideControls);
  container.addEventListener('focusin', showControls);
  container.addEventListener('focusout', hideControls);
  container.addEventListener('touchstart', () => {
    showControls();
    if (touchTimer) clearTimeout(touchTimer);
    touchTimer = setTimeout(hideControls, 3000);
  }, { passive: true });

  let scale = 1, translateX = 0, translateY = 0;
  let startX = 0, startY = 0;

  const updateTransform = () => { div.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`; };
  const reset = () => { scale = 1; translateX = 0; translateY = 0; updateTransform(); };

  zoomInBtn.addEventListener('click', () => { scale = Math.min(scale * 1.2, 5); updateTransform(); });
  zoomOutBtn.addEventListener('click', () => { scale = Math.max(scale / 1.2, 0.5); updateTransform(); });
  resetBtn.addEventListener('click', reset);
  fullscreenBtn.addEventListener('click', () => {
    if (container.requestFullscreen) container.requestFullscreen();
    else if ((container as any).webkitRequestFullscreen) (container as any).webkitRequestFullscreen();
  });

  container.addEventListener('wheel', (e) => {
    const isFullscreen = document.fullscreenElement === container || (document as any).webkitFullscreenElement === container;
    if (!isFullscreen) return;
    e.preventDefault();
    scale = Math.min(Math.max(scale * (e.deltaY > 0 ? 0.9 : 1.1), 0.5), 5);
    updateTransform();
  });

  container.style.cursor = 'grab';

  container.addEventListener('mousedown', (e) => {
    if ((e.target as Element).closest('.mermaid-zoom-controls')) return;
    isDragging = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    container.style.cursor = 'grabbing';
    div.style.transition = 'none';
  });

  container.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateTransform();
  });

  const endDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    container.style.cursor = 'grab';
    div.style.transition = 'transform 0.2s ease-out';
  };

  container.addEventListener('mouseup', endDrag);
  container.addEventListener('mouseleave', endDrag);

  // Touch support
  let touchStartX = 0, touchStartY = 0, initialDistance = 0, initialScale = 1;

  container.addEventListener('touchstart', (e) => {
    if ((e.target as Element).closest('.mermaid-zoom-controls')) return;
    if (e.touches.length === 1) {
      isDragging = true;
      touchStartX = e.touches[0].clientX - translateX;
      touchStartY = e.touches[0].clientY - translateY;
      div.style.transition = 'none';
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialDistance = Math.sqrt(dx * dx + dy * dy);
      initialScale = scale;
    }
    e.preventDefault();
  }, { passive: false });

  container.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && isDragging) {
      translateX = e.touches[0].clientX - touchStartX;
      translateY = e.touches[0].clientY - touchStartY;
      updateTransform();
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      scale = Math.min(Math.max(initialScale * (distance / initialDistance), 0.5), 5);
      updateTransform();
    }
    e.preventDefault();
  }, { passive: false });

  container.addEventListener('touchend', () => {
    isDragging = false;
    div.style.transition = 'transform 0.2s ease-out';
  });
}

export function initMermaidZoom(container: HTMLElement): void {
  const mermaidDivs = container.querySelectorAll<HTMLElement>('div.mermaid');
  mermaidDivs.forEach(initZoomForDiv);
}
