// Enable zoom and pan for Mermaid diagrams (Shadow DOM compatible)
(function () {
  const initZoom = () => {
    console.log("🔍 InitZoom called, searching for Mermaid diagrams...");

    // Find all div.mermaid containers (they contain shadow DOM with SVG)
    const mermaidDivs = document.querySelectorAll("div.mermaid");
    console.log(`Found ${mermaidDivs.length} div.mermaid containers`);

    if (mermaidDivs.length === 0) {
      console.log("No Mermaid div containers found.");
      return;
    }

    mermaidDivs.forEach((div, index) => {
      console.log(`Processing Mermaid div ${index + 1}/${mermaidDivs.length}`);

      // Skip if already initialized
      if (div.classList.contains("zoom-initialized")) {
        console.log(`Div ${index + 1} already initialized, skipping`);
        return;
      }

      console.log(`Initializing zoom for Mermaid div ${index + 1}`);

      // Mark as initialized
      div.classList.add("zoom-initialized");

      // Wrap div in a container for better control
      if (!div.parentElement.classList.contains("mermaid-zoom-container")) {
        const container = document.createElement("div");
        container.className = "mermaid-zoom-container";
        container.style.position = "relative";
        container.style.border = "1px solid #ddd";
        container.style.borderRadius = "4px";
        container.style.overflow = "hidden";
        container.style.marginBottom = "1em";
        container.style.background = "white";

        div.parentNode.insertBefore(container, div);
        container.appendChild(div);

        // Style the mermaid div for transformation
        div.style.transformOrigin = "top left";
        div.style.transition = "transform 0.2s ease-out";

        // Auto-size the container to the rendered Mermaid SVG content.
        // We avoid fixed heights and instead measure the SVG's bounding box (supports Shadow DOM).
        const findSvg = (root) => {
          // direct search
          let svg = root.querySelector && root.querySelector("svg");
          if (svg) return svg;
          // search shadowRoots in descendants
          const nodes = root.querySelectorAll ? root.querySelectorAll("*") : [];
          for (const node of nodes) {
            if (node.shadowRoot) {
              svg = node.shadowRoot.querySelector("svg");
              if (svg) return svg;
            }
          }
          return null;
        };

        const adjustContainerToContent = () => {
          const svg = findSvg(div);
          if (!svg) return;
          // Prefer SVG bbox when available
          let height = 0;
          let width = 0;
          try {
            const bbox = svg.getBBox();
            height = bbox.height;
            width = bbox.width;
          } catch (e) {
            const rect = svg.getBoundingClientRect();
            height = rect.height;
            width = rect.width;
          }
          // Add small padding to avoid clipping
          const padding = 20;
          if (height && Number.isFinite(height)) {
            container.style.height = `${Math.ceil(height + padding)}px`;
          }
          if (width && Number.isFinite(width)) {
            container.style.width = `${Math.ceil(width + padding)}px`;
          }
        };

        // Try to adjust when SVG appears/changes
        const svg = findSvg(div);
        if (svg) {
          // immediate adjust
          requestAnimationFrame(adjustContainerToContent);
          // observe size changes of the SVG
          try {
            const ro = new ResizeObserver(() =>
              requestAnimationFrame(adjustContainerToContent)
            );
            ro.observe(svg);
          } catch (e) {
            // ResizeObserver not available, fallback to window resize
            window.addEventListener("resize", adjustContainerToContent);
          }
        } else {
          // Fallback: poll briefly for the SVG to be inserted
          let tries = 0;
          const poll = setInterval(() => {
            const s = findSvg(div);
            if (s || tries++ > 20) {
              clearInterval(poll);
              requestAnimationFrame(adjustContainerToContent);
              if (s) {
                try {
                  const ro2 = new ResizeObserver(() =>
                    requestAnimationFrame(adjustContainerToContent)
                  );
                  ro2.observe(s);
                } catch (e) {
                  window.addEventListener("resize", adjustContainerToContent);
                }
              }
            }
          }, 200);
        }

        // Add zoom controls
        const controls = document.createElement("div");
        controls.className = "mermaid-zoom-controls";
        controls.style.position = "absolute";
        controls.style.top = "10px";
        controls.style.right = "10px";
        controls.style.zIndex = "1000";
        controls.style.display = "flex";
        controls.style.gap = "5px";
        controls.style.background = "rgba(255, 255, 255, 0.9)";
        controls.style.padding = "5px";
        controls.style.borderRadius = "4px";
        controls.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
        controls.style.opacity = "0";
        controls.style.pointerEvents = "none";
        controls.style.transition = "opacity 0.18s ease-out";

        const buttonStyle =
          "background: white; border: 1px solid #ccc; border-radius: 3px; padding: 8px 12px; cursor: pointer; font-size: 14px; font-weight: bold;";

        const zoomInBtn = document.createElement("button");
        zoomInBtn.textContent = "+";
        zoomInBtn.title = "Zoom In";
        zoomInBtn.style.cssText = buttonStyle;

        const zoomOutBtn = document.createElement("button");
        zoomOutBtn.textContent = "−";
        zoomOutBtn.title = "Zoom Out";
        zoomOutBtn.style.cssText = buttonStyle;

        const resetBtn = document.createElement("button");
        resetBtn.innerHTML = "⟲";
        resetBtn.title = "Reset Zoom";
        resetBtn.style.cssText = buttonStyle;

        const fullscreenBtn = document.createElement("button");
        fullscreenBtn.innerHTML = "⛶";
        fullscreenBtn.title = "Fullscreen";
        fullscreenBtn.style.cssText = buttonStyle;

        controls.appendChild(zoomInBtn);
        controls.appendChild(zoomOutBtn);
        controls.appendChild(resetBtn);
        controls.appendChild(fullscreenBtn);
        container.appendChild(controls);

        // Show toolbox only on hover/focus; hide otherwise. For touch, show briefly.
        let touchTimer = null;
        const showControls = () => {
          controls.style.opacity = "1";
          controls.style.pointerEvents = "auto";
        };
        const hideControls = () => {
          // don't hide while dragging
          if (isDragging) return;
          controls.style.opacity = "0";
          controls.style.pointerEvents = "none";
        };

        container.addEventListener("mouseenter", showControls);
        container.addEventListener("mouseleave", hideControls);
        container.addEventListener("focusin", showControls);
        container.addEventListener("focusout", hideControls);

        // On touch devices, tap shows controls briefly
        container.addEventListener(
          "touchstart",
          (e) => {
            showControls();
            if (touchTimer) clearTimeout(touchTimer);
            touchTimer = setTimeout(() => {
              hideControls();
            }, 3000);
          },
          { passive: true }
        );

        console.log(`✅ Zoom controls added for Mermaid div ${index + 1}`);

        // Initialize pan/zoom state
        let scale = 1;
        let translateX = 0;
        let translateY = 0;
        let isDragging = false;
        let startX = 0;
        let startY = 0;

        const updateTransform = () => {
          div.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        };

        const reset = () => {
          scale = 1;
          translateX = 0;
          translateY = 0;
          updateTransform();
        };

        // Zoom controls
        zoomInBtn.addEventListener("click", () => {
          scale = Math.min(scale * 1.2, 5);
          updateTransform();
        });

        zoomOutBtn.addEventListener("click", () => {
          scale = Math.max(scale / 1.2, 0.5);
          updateTransform();
        });

        resetBtn.addEventListener("click", reset);

        // Fullscreen
        fullscreenBtn.addEventListener("click", () => {
          if (container.requestFullscreen) {
            container.requestFullscreen();
          } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
          }
        });

        // Mouse wheel zoom: only when the container is in fullscreen mode.
        container.addEventListener("wheel", (e) => {
          // If not fullscreen, allow normal page scrolling
          const isFullscreen =
            document.fullscreenElement === container ||
            document.webkitFullscreenElement === container ||
            false;
          if (!isFullscreen) {
            // do not prevent default -> allow page scroll
            return;
          }
          e.preventDefault();
          const delta = e.deltaY > 0 ? 0.9 : 1.1;
          scale = Math.min(Math.max(scale * delta, 0.5), 5);
          updateTransform();
        });

        // Pan with mouse drag
        container.style.cursor = "grab";

        container.addEventListener("mousedown", (e) => {
          if (e.target.closest(".mermaid-zoom-controls")) {
            return;
          }
          isDragging = true;
          startX = e.clientX - translateX;
          startY = e.clientY - translateY;
          container.style.cursor = "grabbing";
          div.style.transition = "none";
        });

        container.addEventListener("mousemove", (e) => {
          if (isDragging) {
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            updateTransform();
          }
        });

        container.addEventListener("mouseup", () => {
          if (isDragging) {
            isDragging = false;
            container.style.cursor = "grab";
            div.style.transition = "transform 0.2s ease-out";
          }
        });

        container.addEventListener("mouseleave", () => {
          if (isDragging) {
            isDragging = false;
            container.style.cursor = "grab";
            div.style.transition = "transform 0.2s ease-out";
          }
        });

        // Touch support for mobile
        let touchStartX = 0;
        let touchStartY = 0;
        let initialDistance = 0;
        let initialScale = 1;

        container.addEventListener(
          "touchstart",
          (e) => {
            if (e.target.closest(".mermaid-zoom-controls")) {
              return;
            }
            if (e.touches.length === 1) {
              isDragging = true;
              touchStartX = e.touches[0].clientX - translateX;
              touchStartY = e.touches[0].clientY - translateY;
              div.style.transition = "none";
            } else if (e.touches.length === 2) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              initialDistance = Math.sqrt(dx * dx + dy * dy);
              initialScale = scale;
            }
            e.preventDefault();
          },
          { passive: false }
        );

        container.addEventListener(
          "touchmove",
          (e) => {
            if (e.touches.length === 1 && isDragging) {
              translateX = e.touches[0].clientX - touchStartX;
              translateY = e.touches[0].clientY - touchStartY;
              updateTransform();
            } else if (e.touches.length === 2) {
              const dx = e.touches[0].clientX - e.touches[1].clientX;
              const dy = e.touches[0].clientY - e.touches[1].clientY;
              const distance = Math.sqrt(dx * dx + dy * dy);
              scale = Math.min(
                Math.max(initialScale * (distance / initialDistance), 0.5),
                5
              );
              updateTransform();
            }
            e.preventDefault();
          },
          { passive: false }
        );

        container.addEventListener("touchend", () => {
          isDragging = false;
          div.style.transition = "transform 0.2s ease-out";
        });
      }
    });
  };

  // Initialize zoom after Mermaid renders
  // Try immediately
  setTimeout(initZoom, 100);

  // Try after a delay (for slower rendering)
  setTimeout(initZoom, 500);
  setTimeout(initZoom, 1000);

  // Re-initialize when new content is loaded (for SPA navigation)
  const observer = new MutationObserver(() => {
    setTimeout(initZoom, 100);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Also initialize on window load
  window.addEventListener("load", () => {
    setTimeout(initZoom, 100);
  });
})();
