interface Options {
  el?: HTMLElement;
  width: number;
  height: number;
  count: number;
  size: number;
  color: string;
  maxLine: number;
  lineWidth: number;
}

/**
 * speed: [方向(-Π~Π), 速度(px/s)]
 */
interface Point {
  x: number;
  y: number;
  speed: [number, number];
}

export default class Particles {
  #el?: HTMLElement;
  #width: number;
  #height: number;
  #count: number;
  #size: number;
  #color: string;
  #maxLine: number;
  #lineWidth: number;

  #points: Point[];
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  #lastTimestemp = 0;

  #onMouseMove: (ev: MouseEvent) => any;

  #destroyed: boolean = false;

  static random(start: number, end: number) {
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      throw RangeError("start和end都必须是有限数值");
    }
    if (start >= end) {
      throw new RangeError("start必须小于end");
    }
    return start + Math.random() * (end - start + Number.EPSILON);
  }

  static calcPointDistance(point: { x: number; y: number }, another: { x: number; y: number }) {
    return Math.sqrt((another.x - point.x) ** 2 + (another.y - point.y) ** 2);
  }

  static movePoint(point: Point, timeMs: number): Point {
    const alph = point.speed[0];
    const r = point.speed[1] * timeMs * 0.001;
    return { ...point, x: point.x + r * Math.cos(alph), y: point.y - r * Math.sin(alph) };
  }

  constructor(options: Options) {
    // FEATURE: Partial

    this.#width = options.width;
    this.#height = options.height;
    this.#count = options.count;
    this.#size = options.size;
    this.#color = options.color;
    this.#maxLine = options.maxLine;
    this.#lineWidth = options.lineWidth;
    if (options.el) {
      if (!(options.el instanceof HTMLElement)) {
        throw new TypeError("options.el shhould be Element");
      }
      this.#el = options.el;
    }
    this.#canvas = document.createElement("canvas");
    this.#ctx = this.#canvas.getContext("2d")!;

    this.#canvas.width = this.#width;
    this.#canvas.height = this.#height;

    if (this.#el) {
      this.#el.appendChild(this.#canvas);
    }

    this.#points = new Array(this.#count).fill(null).map(() => ({
      x: Particles.random(0, this.#width),
      y: Particles.random(0, this.#height),
      speed: [Particles.random(-Math.PI, Math.PI), 50],
    }));
    this.#draw();

    this.#onMouseMove = this.#handleMouseMove.bind(this);
    this.#bindEvents();
    
    this.#lastTimestemp = Date.now();
    this.#flash()
  }

  mount(el: HTMLElement) {
    if (this.#destroyed) return;
    if (this.#el) return;

    this.#el = el;
    this.#el.appendChild(this.#canvas);
  }

  destroy() {
    if (this.#destroyed) return;

    this.#canvas.removeEventListener("mousemove", this.#onMouseMove);
    this.#destroyed = true;
  }

  #bindEvents() {
    this.#canvas.addEventListener("mousemove", this.#onMouseMove);
  }

  #handleMouseMove(e: MouseEvent) {
    console.log("move", e, this);
  }

  #flash() {
    const now = Date.now();
    const step = now - this.#lastTimestemp;
    this.#lastTimestemp = now;

    this.#points.map((point) => Particles.movePoint(point, step));
    this.#draw();
    requestAnimationFrame(this.#flash.bind(this));
  }

  #draw() {
    this.#ctx.clearRect(0, 0, this.#width, this.#height);
    this.#ctx.fillStyle = this.#color;
    for (const point of this.#points) {
      const { x, y } = point;

      for (const anotherPoint of this.#points) {
        const d = Particles.calcPointDistance(point, anotherPoint);
        if (d <= this.#size || d >= this.#maxLine) continue;

        const lineColor =
          this.#color +
          Math.floor((1 - d / this.#maxLine) * 0xff)
            .toString(16)
            .padStart(2, "0");

        this.#ctx.beginPath();
        this.#ctx.strokeStyle = lineColor;
        this.#ctx.lineWidth = this.#lineWidth;
        this.#ctx.moveTo(x, y);
        this.#ctx.lineTo(anotherPoint.x, anotherPoint.y);
        this.#ctx.stroke();
        this.#ctx.closePath();
      }

      this.#ctx.beginPath();
      this.#ctx.arc(x, y, this.#size, 0, 2 * Math.PI);
      this.#ctx.fill();
      this.#ctx.closePath();
    }
  }
}
