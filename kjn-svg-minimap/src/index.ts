import Logger from "./logger";

const logger = new Logger("svg-minimap");

export default class SvgMinimap {
  svgElement: SVGElement;
  minimap: SVGElement;
  minimapVirtualView: SVGElement;

  constructor(svgElement: SVGElement, minimapContainer: HTMLElement) {
    logger.debug("Initialising minimap");

    if (svgElement.children.length === 0) {
      throw Error("Cannot create minimap for svg element without children");
    }

    this.svgElement = svgElement;
    if (!svgElement.getAttribute("viewBox")) {
      const viewBox = `0 0 ${svgElement.clientWidth} ${svgElement.clientHeight}`;
      console.warn("No viewBox found on the svgElement, setting initial viewBox to: " + viewBox);
      svgElement.setAttribute("viewBox", viewBox);
    }

    [this.minimap, this.minimapVirtualView] = this.#createMinimap();
    minimapContainer.appendChild(this.minimap);

    // Refresh rate
    setInterval(() => {
      this.drawVirtualView();
    }, 1);

    // Panning and zooming will both update the viewBox of the svgElement.
    this.#addMinimapPan();
    this.#addMinimapZoom();
  }

  /**
   * Update the minimap virtualView based on the viewBox of the parent
   */
  drawVirtualView() {
    const [x, y, width, height] = this.svgViewBox;
    this.minimapVirtualView.setAttribute("x", x.toFixed(2));
    this.minimapVirtualView.setAttribute("y", y.toFixed(2));
    this.minimapVirtualView.setAttribute("width", width.toFixed(2));
    this.minimapVirtualView.setAttribute("height", height.toFixed(2));
  }

  /**
   * Initialise the minimap component by creating the virtual map and the virtualViewBox
   *
   * Effectively this minimap contains 3 components
   *  - The minimap itself, an svg element with a viewBox, x, and y positions to function as a
   * virtual viewbox
   *  - The virtual items, a copy of the actual svg that functions as a virtual layer
   *  - The virtualViewBox, the rectangle that indicates which portion of the whole image is
   * currently visible.
   *
   * @returns The minimap element and the minimapVirtualViewBox element.
   */
  #createMinimap(): [SVGElement, SVGElement] {
    const minimap = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const svgDimensions = this.dimensions;

    // We're setting the viewBox of the minimap such that it fits the every element of the svg inside.
    const viewBoxWidth = svgDimensions.maxX - svgDimensions.minX;
    const viewBoxHeight = svgDimensions.maxY - svgDimensions.minY;
    const minimapViewBox = `${svgDimensions.minX} ${svgDimensions.minY} ${viewBoxWidth} ${viewBoxHeight}`;

    // Minimap should fill the container it is placed inside of
    minimap.style.width = "100%";
    minimap.style.height = "100%";

    minimap.setAttribute("viewBox", minimapViewBox);

    // Now we're copying every item of the svg element to the minimap.
    // Perhaps this should be done a bit differently, e.g. to atleast exclude id's, or another way
    // to indicate that the elements are copied/virtual, and not 'real'
    minimap.innerHTML = this.svgElement.innerHTML;

    const virtualView = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    virtualView.setAttribute("x", svgDimensions.minX.toString());
    virtualView.setAttribute("y", svgDimensions.minY.toString());
    virtualView.setAttribute("width", viewBoxWidth.toString());
    virtualView.setAttribute("height", viewBoxHeight.toString());
    virtualView.style.fill = "green";
    virtualView.style.stroke = "green";
    virtualView.style.strokeWidth = "2";
    virtualView.style.fillOpacity = "0.1";
    virtualView.style.strokeOpacity = "0.9";
    minimap.appendChild(virtualView);

    return [minimap, virtualView];
  }

  /**
   * Adds zoom functionality to the minimap. Will update the viewBox of the original svg element
   * 给小地图添加缩放功能, 会更新svg的大小
   */
  #addMinimapZoom() {
    const zoom = (zoomRatio: number) => {
      const [viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight] = this.svgViewBox;

      // Calculate how much width and height should be added to the viewBox
      // Intution: zooming in with a factor 0.10, means that the viewBox should become 10% smaller
      const deltaViewBoxWidth = viewBoxWidth * zoomRatio * -1;
      const deltaViewBoxHeight = viewBoxHeight * zoomRatio * -1;

      // Calculate the new viewBox width and height based on the zoomRatio.
      // Intuition: when zooming in the viewBox is showing less pixels
      const newViewBoxWidth = viewBoxWidth + deltaViewBoxWidth;
      const newViewBoxHeight = viewBoxHeight + deltaViewBoxHeight;

      // Calculate the new x and y positions based on the left and top side ratios
      // Intuition: zooming in on the left means that the viewBoxWidth gets smaller
      //  which means that deltaViewBoxWidth is < 0.
      //  which means that viewBoxX should increase.
      //  therefore
      const newViewBoxX = viewBoxX + -1 * deltaViewBoxWidth * 0.5;
      const newViewBoxY = viewBoxY + -1 * deltaViewBoxHeight * 0.5;

      const newViewBox = `${newViewBoxX} ${newViewBoxY} ${newViewBoxWidth} ${newViewBoxHeight}`;
      this.svgElement.setAttribute("viewBox", newViewBox);
    };
    // 监听鼠标滚动, 修改选区框大小
    this.minimap.addEventListener(
      "wheel",
      (ev) => {
        // ev.deltaY is positive on zooming out and negative on zooming in.
        // 往下滚动, 缩小视图, 数值为负
        const zoomPercentage = ev.deltaY * -1;
        const zoomRatio = zoomPercentage * 0.01;
        zoom(zoomRatio);
      },
      { passive: true }
    );
  }

  /**
   * Adds pan functionality to the minimap. Will update the viewBox of the original svg element
   */
  #addMinimapPan() {
    // Keep track of whether we're in 'dragging' mode. Since we're ALWAYS listening on every mouse on the whole document
    // we need to know that should be dragging the svg element with our mouse movements.
    let draggingSvg = false;

    // When dragging we need to update the x, and y coorindates of the viewBox. To figure out the relative drag distances
    // we require a starting position to compare with the position after dragging.
    let lastMouseXPosition = -1;
    let lastMouseYPosition = -1;

    this.minimap.addEventListener("mousedown", (ev) => {
      draggingSvg = true;
      lastMouseXPosition = ev.clientX;
      lastMouseYPosition = ev.clientY;
    });

    document.addEventListener("mousemove", (ev) => {
      if (!draggingSvg) {
        return;
      }

      // Compare the current mouse position with the previous position
      const { clientX: mouseXPosition, clientY: mouseYPosition } = ev;

      // How much we should pan the original svg element is the amount we move our mouse
      // Also taking into account that we're looking at the minimap with some scale.
      // e.g. If the minimap is 100px width but showing 400px, that means that every pixel panned should be moved
      // with a factor 4. Which is the same as deviding by the shown scale. Since the scale would be 0.25
      // We're seeing the image at 1/4 its true size.
      const deltaX = (lastMouseXPosition - mouseXPosition) / this.virtualViewBoxScale;
      const deltaY = (lastMouseYPosition - mouseYPosition) / this.virtualViewBoxScale;

      lastMouseXPosition = mouseXPosition;
      lastMouseYPosition = mouseYPosition;

      const [x, y, width, height] = this.svgViewBox;

      // Width and height shouldn't change since we're only panning
      const newViewBox = `${(x - deltaX).toFixed(2)} ${(y - deltaY).toFixed(2)} ${width} ${height}`;
      this.svgElement.setAttribute("viewBox", newViewBox);
    });

    document.addEventListener("mouseup", () => {
      draggingSvg = false;
      lastMouseXPosition = -1;
      lastMouseYPosition = -1;
    });
  }

  get virtualViewBoxScale() {
    const [, , viewBoxWidth, viewBoxHeight] = this.minimapViewBox;
    const widthScale = this.minimap.clientWidth / viewBoxWidth;
    const heightScale = this.minimap.clientHeight / viewBoxHeight;

    if (widthScale.toFixed(2) !== heightScale.toFixed(2)) {
      logger.error(`Got inconsistent scale: ${widthScale} vs ${heightScale}`);
    }

    return widthScale;
  }

  /**
   * Fetches the viewBox of the svg element
   */
  get svgViewBox() {
    const attribute =  this.svgElement.getAttribute("viewBox")
    const viewBox = attribute ? attribute.split(" ").map(Number) : null;
    if (!viewBox) throw Error("Failed getting viewBox for svg");

    return viewBox;
  }

  /**
   * Fetches the viewBox of the svg element
   */
  get minimapViewBox() {
    const attribute =  this.minimap.getAttribute("viewBox")
    const viewBox = attribute ? attribute.split(" ").map(Number) : null;
    if (!viewBox) throw Error("Failed getting viewBox for minimap");

    return viewBox;
  }

  /**
   * Get the dimensions of the svgElement by gathering the mix and max dimensions of each child node.
   */
  get dimensions(): Dimension {
    if (!this.svgElement.children.length) {
      logger.warn("");
    }
    const dimensions = [
      ...(this.svgElement.children as unknown as SVGGraphicsElement[]),
    ].reduce<Dimension | null>((prev: Dimension | null, cur: SVGGraphicsElement) => {
      const curBox = cur.getBBox();
      const maxXCur = curBox.x + curBox.width;
      const maxYCur = curBox.y + curBox.height;

      if (!prev) {
        return { minX: curBox.x, maxX: maxXCur, minY: curBox.y, maxY: maxYCur };
      }

      const result = {
        minX: Math.min(prev.minX, curBox.x),
        maxX: Math.max(prev.maxX, maxXCur),
        minY: Math.min(prev.minY, curBox.y),
        maxY: Math.max(prev.maxY, maxYCur),
      };

      return result;
    }, null);

    if (!dimensions) {
      throw Error("Invalid svg element");
    }

    return dimensions;
  }
}

type Dimension = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};
