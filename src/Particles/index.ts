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

interface Point {
  x: number;
  y: number;
  /** 速度(px/s) */
  speed: number;
  /** 角度方向(-180~180) */
  angle: number;
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

  #mousePos: null | { x: number; y: number } = null;
  #onMouseMove: (ev: MouseEvent) => any;
  #onMouseLeave: (ev: MouseEvent) => any;

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

  static calcPointAngle(point: { x: number; y: number }, another: { x: number; y: number }) {
    const y = point.y - another.y;
    const x = another.x - point.x;
    if (x === +0 || x === -0) {
      return y > 0 ? 90 : y < 0 ? -90 : undefined;
    }
    if (x > 0) {
      return (Math.atan(y / x) * 180) / Math.PI;
    } else if (y >= 0) {
      return 180 + (Math.atan(y / x) * 180) / Math.PI;
    } else if (y < 0) {
      return -180 + (Math.atan(y / x) * 180) / Math.PI;
    }
  }

  static mirrorAngle(angle: number, axis: "x" | "y"): number {
    if (axis === "x") {
      return -angle;
    }
    if (axis === "y") {
      if (angle >= 0 && angle < 180) {
        return 180 - angle;
      } else if (angle < 0 && angle >= -180) {
        return -180 - angle;
      }
    }
    return angle;
  }

  constructor(options: Options) {
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
      speed: 50,
      angle: Particles.random(-180, 180),
    }));
    this.#draw();

    this.#onMouseMove = this.#handleMouseMove.bind(this);
    this.#onMouseLeave = this.#handleMouseLeave.bind(this);
    this.#bindEvents();

    this.#lastTimestemp = Date.now();
    this.#flash();
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
    this.#canvas.addEventListener("mouseleave", this.#onMouseLeave);
  }

  #handleMouseMove(e: MouseEvent) {
    this.#mousePos = { x: e.offsetX, y: e.offsetY };
  }
  #handleMouseLeave() {
    this.#mousePos = null;
  }

  #flash() {
    const now = Date.now();
    const step = now - this.#lastTimestemp;
    this.#lastTimestemp = now;

    this.#points = this.#points.map((point, index) =>
      this.#movePoint(point, step, this.#width, this.#height, index === 0)
    );
    this.#draw();
    requestAnimationFrame(this.#flash.bind(this));
  }

  #movePoint(point: Point, timeMs: number, maxWidth: number, maxHeight: number, log?: boolean): Point {
    let { speed, x, y, angle } = point;

    if (this.#mousePos) {
      const disFromMoouse = Particles.calcPointDistance({ x, y }, this.#mousePos);
      if (disFromMoouse < 200) {
        const forceAngle = Particles.calcPointAngle({ x, y }, this.#mousePos);
        if (forceAngle !== undefined) {
          console.log(forceAngle);
          angle = forceAngle;
          speed = disFromMoouse * 0.005 * 30 + 50;
        }
      }
    } else {
      speed = 50;
    }

    const r = speed * timeMs * 0.001;
    x = x + r * Math.cos((angle * Math.PI) / 180);
    y = y - r * Math.sin((angle * Math.PI) / 180);

    if (x > maxWidth) {
      x = maxWidth;
      angle = Particles.mirrorAngle(angle, "y");
    } else if (x < 0) {
      x = -x;
      angle = Particles.mirrorAngle(angle, "y");
    }

    if (y > maxHeight) {
      y = maxHeight;
      angle = Particles.mirrorAngle(angle, "x");
    } else if (y < 0) {
      y = -y;
      angle = Particles.mirrorAngle(angle, "x");
    }

    return { speed, x, y, angle };
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
