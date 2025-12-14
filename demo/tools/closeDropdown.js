document.addEventListener("DOMContentLoaded", () => {
    const dropdowns = [
      {
        btn: document.getElementById("filledShapeTool"),
        panel: document.getElementById("ShapeOptionsFilled"),
      },
      {
        btn: document.getElementById("outlineShapeTool"),
        panel: document.getElementById("ShapeOptionsOutline"),
      },
    ];
  
    dropdowns.forEach(({ btn, panel }) => {
      if (!btn || !panel) return;
  
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
  
        // Close all others first
        dropdowns.forEach(d => {
          if (d.panel !== panel) {
            d.panel.classList.add("hidden");
          }
        });
  
        // Toggle current
        panel.classList.toggle("hidden");
      });
    });
  
    // ONE global click handler
    document.addEventListener("click", () => {
      dropdowns.forEach(({ panel }) => {
        panel.classList.add("hidden");
      });
    });
  });