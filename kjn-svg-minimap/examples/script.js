import SvgPanZoom from "@kjn/svg-pan-zoom";
import SvgMinimap from "@kjn/svg-minimap";

// Makes the main svg element pannable and zoomable
new SvgPanZoom(document.getElementById("svg"));

// Adds a minimap of the main svg element
new SvgMinimap(document.getElementById("svg"), document.getElementById("minimapContainer"));
