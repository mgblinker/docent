// Initialize Mermaid with proper configuration
window.mermaidConfig = {
  startOnLoad: true,
  theme: "default",
  securityLevel: "loose",
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
  },
};

// Initialize when Mermaid is loaded
if (typeof mermaid !== "undefined") {
  mermaid.initialize(window.mermaidConfig);
  console.log("✅ Mermaid initialized");

  // Debug: Check for mermaid code blocks
  setTimeout(() => {
    const mermaidBlocks = document.querySelectorAll(
      "pre.mermaid, code.mermaid, .mermaid"
    );
    console.log(`Found ${mermaidBlocks.length} elements with .mermaid class`);
    mermaidBlocks.forEach((block, i) => {
      console.log(
        `Mermaid block ${i + 1}:`,
        block.tagName,
        block.className,
        block.textContent.substring(0, 50)
      );
    });

    // Try to manually trigger rendering
    if (mermaidBlocks.length > 0) {
      console.log("Attempting manual Mermaid render...");
      mermaid.run();
    }
  }, 500);
} else {
  console.log("⏳ Waiting for Mermaid to load...");
}
