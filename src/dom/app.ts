import Qtree from "../common/qtree.js";
import ImagePart from "../common/imagepart.js";
import Mouse from "../common/mouse.js";

import { assert, shuffle } from "../common/utils.js";

import { Config, MessageFromMasterToSlave, MessageFromSlaveToMaster } from "../common/types";

const WEB_WORKER_PATH = "js/webworker/worker.js";


export default class App {
  private cfg: Config; // object
  private workers: Array<Worker>;
  private workerScriptPath: string;
  private defaultNumberOfWorkers: number;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private qtree: Qtree;
  private imageParts: Array<ImagePart>;
  private imageData: ImageData;
  private imageDataBuffer: ImageData;
  private updated: boolean;

  private workersAvailability: Array<boolean>;
  private timestamp: number;
  private mouse: Mouse;

  private canvasNeedsToUpdate: boolean;

  constructor(canvas: HTMLCanvasElement) {
    // TypeScript, get off my back!
    this.canvas = canvas;
    {
      const ctx = this.canvas.getContext("2d");
      assert(ctx !== null);
      this.ctx = ctx;
    }
    this.workers = [];
    this.workerScriptPath = WEB_WORKER_PATH;
    this.defaultNumberOfWorkers = 8;
    this.qtree = new Qtree();
    this.imageParts = [];
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.imageDataBuffer = this.ctx.createImageData(
      1,
      1
    );
    this.canvasNeedsToUpdate = true;
    this.imageData = this.ctx.getImageData(
      0,
      0,
      1,
      1
    );
    this.updated = false;
    this.workersAvailability = [];
    this.timestamp = App.getTimestamp();
    
    this.mouse = new Mouse();

    this.cfg = {
      width: 0,
      height: 0,
      scene: {
        theta: 0,
        point: {
          re: -0.5, // real value (x)
          im: 0 // imaginary value (y)
        },
        zoom: 4, // lower value --> zoom in
        rendering: {
          threshold: 150_000,

          // Supersampling
          ss: {
            hor: {
              min: -0.5,
              max: 0.5,
              splits: 3 // I can do the splits, no problem!
            },
            ver: {
              min: -0.5,
              max: 0.5,
              splits: 3
            }
          }
        }
      },
      _precomputed: {
        z0: -1,
        sx0: -1,
        sy0: -1,
        cos: -1,
        sin: -1,
      }
    };

    
    this.updated = false;


    this.timestamp = App.getTimestamp();
    this.workers = [];
    this.workersAvailability = [];
    this.workerScriptPath = WEB_WORKER_PATH;
    this.defaultNumberOfWorkers = 8;

    this.qtree = new Qtree();

    this.setWidth(window.innerWidth);
    this.setHeight(window.innerHeight);

    this.qtree.splitSubTree(4); // 2x2 (4)

    let w = Math.ceil(this.getWidth());
    let h = Math.ceil(this.getHeight());

    this.imageParts = [];

    for (let i = 0; i < this.defaultNumberOfWorkers; i += 1) {
      let imagePart = new ImagePart(w, h, 4);
      this.imageParts.push(imagePart);
    }

    for (let i = 0; i < this.defaultNumberOfWorkers; i++) {
      this.workers[i] = new Worker(this.workerScriptPath, { type: "module" });
      this.workersAvailability.push(true);
    }

    let self = this;

    window.addEventListener(
      "resize",
      function () {
        self.resizeCanvas();
      },
      false
    );


    this.canvas.addEventListener("mousedown", e => {
      this.mouse.consume(e);
    });

    this.canvas.addEventListener("mousemove", e => {
      this.mouse.consume(e);

      if (this.mouse.mbdr) {
        this.refresh();

        const x = this.mouse.x;
        const y = this.mouse.y;

        const px = this.mouse.px;
        const py = this.mouse.py

        let ox = px;
        let oy = py;

        let L = Math.min(this.cfg.width, this.cfg.height);
        let z0 = 1 / L;

        let z = this.cfg.scene.zoom;

        let sdx = ox - x;
        let sdy = oy - y;

        let wx0 = this.cfg.scene.point.re;
        let wy0 = this.cfg.scene.point.im;

        let wdx = +z * z0 * sdx;
        let wdy = -z * z0 * sdy;

        let sin = 0;
        let cos = 1;

        let wrdx = cos * wdx - sin * wdy;
        let wrdy = sin * wdx + cos * wdy;

        let wx = wx0 + wrdx;
        let wy = wy0 + wrdy;

        this.cfg.scene.point.re = wx;
        this.cfg.scene.point.im = wy;
      }
    });

    this.canvas.addEventListener("mouseup", e => {
      this.mouse.consume(e);
    });

    this.canvas.addEventListener("wheel", (e: WheelEvent) => {
      this.mouse.consume(e);

      let dy = this.mouse.wdy;

      let z = this.cfg.scene.zoom;

      let factor = 1;

      let magnitude = 0.2;

      const toggle = false;

      const sign = toggle ? 1.0 : -1.0;

      if (dy > 0) {
        factor = 1 - sign * magnitude;
      } else {
        factor = 1 + sign * magnitude;
      }

      z *= factor;

      this.cfg.scene.zoom = z;
      this.refresh();
    });

    this.canvas.addEventListener("dblclick", e => {
      this.mouse.consume(e);

      let rect = this.canvas.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;

      let L = Math.min(this.cfg.width, this.cfg.height);
      let z0 = 1 / L;

      let z = this.cfg.scene.zoom;

      let sdx = x - this.cfg.width / 2;
      let sdy = y - this.cfg.height / 2;

      let wx0 = this.cfg.scene.point.re;
      let wy0 = this.cfg.scene.point.im;

      let wdx = +z * z0 * sdx;
      let wdy = -z * z0 * sdy;

      let sin = 0;
      let cos = 1;

      let wrdx = cos * wdx - sin * wdy;
      let wrdy = sin * wdx + cos * wdy;

      let wx = wx0 + wrdx;
      let wy = wy0 + wrdy;

      this.cfg.scene.point.re = wx;
      this.cfg.scene.point.im = wy;

      this.refresh();
    });

    this.canvas.width = this.getWidth();
    this.canvas.height = this.getHeight();
    // NOTE: this doesn't look super cool.
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

    this.imageDataBuffer = this.ctx.createImageData(
      this.getWidth(),
      this.getHeight()
    );

    this.imageData = this.ctx.getImageData(
      0,
      0,
      this.getWidth(),
      this.getHeight()
    );
  }

  private precomputeGlobalConfig() {
    const cfg = this.cfg;

    const { width, height, scene: { theta } } = cfg;

    cfg._precomputed.z0 = 1.0 / Math.min(width, height);
    cfg._precomputed.sx0 = width / 2.0;
    cfg._precomputed.sy0 = height / 2.0;
    cfg._precomputed.cos = Math.cos(theta);
    cfg._precomputed.sin = Math.sin(theta);
  }

  private isUpdated() {
    return this.updated;
  }

  private getRegion(code: string) {
    let x = 0;
    let y = 0;
    let w = this.getWidth();
    let h = this.getHeight();

    for (let i = 0; i < code.length; i += 1) {
      let c = code.charAt(i);

      switch (c) {
        case "1":
          w = Math.ceil(w / 2);
          h = Math.ceil(h / 2);
          break;
        case "2":
          x += Math.ceil(w / 2);
          w = Math.floor(w / 2);
          h = Math.ceil(h / 2);
          break;
        case "3":
          y += Math.ceil(h / 2);
          w = Math.ceil(w / 2);
          h = Math.floor(h / 2);
          break;
        case "4":
          x += Math.ceil(w / 2);
          y += Math.ceil(h / 2);
          w = Math.floor(w / 2);
          h = Math.floor(h / 2);
          break;
        default:
          throw new Error();
      }
    }

    return {
      x: x,
      y: y,
      w: w,
      h: h
    };
  }

  private setLatestTimestamp() {
    this.timestamp = new Date().getTime();
  }

  private getLatestTimestamp() {
    return this.timestamp;
  }

  private static getTimestamp() {
    return new Date().getTime();
  }

  private getWidth() {
    return this.cfg.width;
  }

  private getHeight() {
    return this.cfg.height;
  }

  private setWidth(width: number) {
    this.cfg.width = width;
  }

  private setHeight(height: number) {
    this.cfg.height = height;
  }

  /**
   * I guess any time you make any change, you need to call this function
   * to rerender.
   */
  private refresh() {
    // TODO: handle resize (?)

    if (this.canvasNeedsToUpdate) {
      const width = this.getWidth();
      const height = this.getHeight();

      this.canvas.width = width;
      this.canvas.height = height;

      this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

      this.canvasNeedsToUpdate = false;

      for (let i = 0; i < this.imageData.data.length; i += 1) {
        this.imageDataBuffer.data[i] = this.imageData.data[i];
      }

      this.imageData = this.ctx.getImageData(0, 0, width, height );
      this.imageData = this.ctx.getImageData(0, 0, width, height);
    }

    this.setLatestTimestamp();
    this.updated = true;

    // What we're going to do when we need to redraw the canvas
    {
      const CHOICE = 1;
      if (CHOICE === 1) {
        // Clear the canvas
        this.ctx.putImageData(this.imageData, 0, 0);
      } else if (CHOICE === 2) {
        // Don't clear the canvas
      }
    }

    

    this.qtree.forAllPreorder(self => { self.setFlag(false); });

    for (let i = 0; i < this.workers.length; i += 1) {
      if (this.workersAvailability[i]) {
        this.requestJob(i);
      }
    }
  }

  public start() {
    this.precomputeGlobalConfig();

    for (let i = 0; i < this.workers.length; i += 1) {
      this.requestJob(i);
    }
  }

  private requestJob(workerIndex: number) {
    // Searches quad tree for a job

    let node = this.qtree;
    let running = true;
    let count = 0;
    let threshold = 10000;

    if (node.isLeaf() || node.getFlag()) {
      running = false;
    }

    while (running && count < threshold) {
      let n = node.getChildren().length;
      count += 1;

      let idxList = [0, 1, 2, 3];

      shuffle(idxList);

      for (let i = 0; i < n; i += 1) {
        let child = node.getChildren()[idxList[i]];
        if (!child.getFlag()) {
          node = child;
          if (child.isLeaf()) {
            running = false;
          }
          break;
        }
      }
    }

    if (count >= threshold - 1) {
      throw new Error("Something is not right");
    }

    if (!running && !node.getFlag()) {
      node.setFlag(true); // claim this region
      this.workersAvailability[workerIndex] = false;
      this.scheduleJob(workerIndex, node);
    } else {
      // No more jobs for you
      this.updated = false;
    }
  }

  private workerCallback(e: MessageEvent) {
    const msg: MessageFromSlaveToMaster = e.data;

    // TODO: the data received might be stale since the user might have moved 
    // the viewport and zoomed in or zoomed out.  Should we try to scale up or
    // scale down the area and redraw it?

    // TODO: if the data is stale that is being received, maybe discard it
    // or move it??

    const workerIndex = msg.workerIndex;

    // Mark worker as available.
    this.workersAvailability[workerIndex] = true;

    const arr = new Uint8ClampedArray(msg.imgPart);

    /////////////////////////////
    // Draw region onto canvas //
    /////////////////////////////

    // Canvas
    const c_re = this.cfg.scene.point.re;
    const c_im = this.cfg.scene.point.im;
    const c_zoom = this.cfg.scene.zoom;

    // Region
    const r_re = msg.re;
    const r_im = msg.im;
    const r_zoom = msg.zoom;


    // TODO: reposition and rescale region.

    if (true || this.getLatestTimestamp() === msg.timestamp) {
      /** Width of canvas. */
      const w = this.getWidth();
      /** How many color channels to iterate through. */
      const channels = 4;

      const region = this.getRegion(msg.part);


      for (let y = 0; y < region.h; y += 1) {
        for (let x = 0; x < region.w; x += 1) {
          const ic = x + region.x + (y + region.y) * w;
          const id = x + y * region.w;

          // Multiply for all 4 color channels.

          /* Canvas index */
          const _ic = 4 * ic;
          /* Data (region) index */
          const _id = 4 * id;

          for (let ch = 0; ch < channels; ch += 1) {
            this.imageData.data[_ic + ch] = arr[_id + ch];
          }
        }
      }

      // Paint
      this.ctx.putImageData(this.imageData, 0, 0);
    }

    this.imageParts[workerIndex].arr = arr;
    this.requestJob(workerIndex);
  }

  private scheduleJob(workerIndex: number, node: Qtree) {
    let region = this.getRegion(node.getPath());
    let imagePart = this.imageParts[workerIndex];

    const message: MessageFromMasterToSlave = {
      cfg: this.cfg,
      region: region,
      workerIndex: workerIndex,
      part: node.getPath(),
      imagePart: {
        arr: imagePart.arr,
        buffer: imagePart.arr.buffer,
        data: imagePart.getAdditionalData()
      },
      timestamp: this.getLatestTimestamp()
    };

    let transferList = [message.imagePart.buffer];
    let self = this;

    App.startJob(this.workers[workerIndex], message, transferList, function (e) {
      self.workerCallback(e);
    });
  }

  private static startJob(worker: Worker, message: Object, transferList: Transferable[], callback: (e: MessageEvent) => void) {
    // Message is an object with things that will be COPIED (minus those that
    // will be moved)
    // transferList is a list containing things that will be MOVED

    // This is what the worker sends back.
    worker.onmessage = callback;

    // This is what you want the worker to do.
    worker.postMessage(message, transferList);
  }

  private resizeCanvas(): void {
    this.setWidth(window.innerWidth);
    this.setHeight(window.innerHeight);
    this.updated = true;
    this.canvasNeedsToUpdate = true;
    this.precomputeGlobalConfig();
    this.refresh();
  }
}
