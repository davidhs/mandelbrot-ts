/// <reference lib="esnext" />
/// <reference lib="dom" />

import Qtree from "../common/qtree.js";
import ImagePart from "../common/imagepart.js";
import Mouse from "../common/mouse.js";

import { assert, shuffle } from "../common/utils.js";

import { Config, MessageFromMasterToSlave, MessageFromSlaveToMaster, Region } from "../common/types";

const WEB_WORKER_PATH = "js/webworker/worker.js";

const DEFAULT_NUMBER_OF_WORKS = 8;



export default class App {
  private cfg: Config; // object
  private workers: Array<Worker>;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private qtree: Qtree;
  private imageParts: Array<ImagePart>;
  private imageData: ImageData;
  private imageDataBuffer: ImageData;


  private isWorkerAvailable: Array<boolean>;
  private mouse: Mouse;

  private canvasNeedsToUpdate: boolean;

  constructor(canvas: HTMLCanvasElement) {


    const ctx = canvas.getContext("2d");
    assert(ctx !== null);
    const workers: Worker[] = [];
    const mouse = new Mouse();
    const cfg: Config = {
      id: Date.now(),
      cw: 0,
      ch: 0,
      re: -0.5,
      im: +0.0,
      z: 4,
      max_iter: 15000,
    };

    const qtree = new Qtree();
    const imageParts: ImagePart[] = [];
    const isWorkerAvailable: boolean[] = [];



    this.canvas = canvas;
    this.ctx = ctx;
    this.workers = workers;
    this.qtree = qtree;
    this.imageParts = imageParts;
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.imageDataBuffer = this.ctx.createImageData(1, 1);
    this.canvasNeedsToUpdate = true;
    this.imageData = this.ctx.getImageData(0, 0, 1, 1);
    this.isWorkerAvailable = isWorkerAvailable;
    this.mouse = mouse;
    this.cfg = cfg;

    cfg.cw = window.innerWidth;
    cfg.ch = window.innerHeight;

    const NR_OF_SPLITS = 4;

    // 1 -> progress too slow (not enough regions)
    // 2 -> could be a little bit fast (not enough regions)
    // 3 -> maybe a bit more?
    // 4 -> 
    // 5 -> slower than 4
    // 6 -> too slow, too much overhead (too many regions)
    qtree.splitSubTree(NR_OF_SPLITS); // 2x2 (4)

    let w = Math.ceil(cfg.cw);
    let h = Math.ceil(cfg.ch);

    for (let i = 0; i < DEFAULT_NUMBER_OF_WORKS; i += 1) {
      let imagePart = new ImagePart(w, h, 4);
      imageParts.push(imagePart);
    }

    for (let i = 0; i < DEFAULT_NUMBER_OF_WORKS; i += 1) {
      workers[i] = new Worker(WEB_WORKER_PATH, { type: "module" });
      isWorkerAvailable.push(true);
    }

    canvas.width = cfg.cw;
    canvas.height = cfg.ch;

    this.imageDataBuffer = ctx.createImageData(cfg.cw, cfg.ch);

    this.imageData = ctx.getImageData(
      0,
      0,
      cfg.cw,
      cfg.ch
    );


    window.addEventListener("resize", () => { this.resizeCanvas() }, false);

    canvas.addEventListener("mousedown", e => {
      this.mouse.consume(e);
    });

    canvas.addEventListener("mousemove", e => {
      this.mouse.consume(e);

      if (this.mouse.mbdr) {
        let L = Math.min(this.cfg.cw, this.cfg.ch);
        let z0 = 1 / L;

        let z = this.cfg.z;

        let sdx = this.mouse.px - this.mouse.cx;
        let sdy = this.mouse.py - this.mouse.cy;

        let wx0 = this.cfg.re;
        let wy0 = this.cfg.im;

        let wdx = +z * z0 * sdx;
        let wdy = -z * z0 * sdy;

        let wx = wx0 + wdx;
        let wy = wy0 + wdy;

        this.cfg.re = wx;
        this.cfg.im = wy;

        this.refresh();
      }
    });

    canvas.addEventListener("mouseup", (e) => {
      this.mouse.consume(e);
    });

    canvas.addEventListener("wheel", (e) => {
      this.mouse.consume(e);

      let dy = this.mouse.wdy;

      let z = this.cfg.z;

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

      this.cfg.z = z;

      this.refresh();
    });

    canvas.addEventListener("dblclick", (e) => {
      this.mouse.consume(e);

      let rect = this.canvas.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;

      let L = Math.min(this.cfg.cw, this.cfg.ch);
      let z0 = 1 / L;

      let z = this.cfg.z;

      let sdx = x - this.cfg.cw / 2;
      let sdy = y - this.cfg.ch / 2;

      let wx0 = this.cfg.re;
      let wy0 = this.cfg.im;

      let wdx = +z * z0 * sdx;
      let wdy = -z * z0 * sdy;

      let sin = 0;
      let cos = 1;

      let wrdx = cos * wdx - sin * wdy;
      let wrdy = sin * wdx + cos * wdy;

      let wx = wx0 + wrdx;
      let wy = wy0 + wrdy;

      this.cfg.re = wx;
      this.cfg.im = wy;

      this.refresh();
    });
  }

  private getRegion(code: string): Region {
    let x = 0;
    let y = 0;
    let w = this.cfg.cw;
    let h = this.cfg.ch;

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


  /**
   * I guess any time you make any change, you need to call this function
   * to rerender.
   */
  private refresh() {
    if (this.canvasNeedsToUpdate) {
      this.canvasNeedsToUpdate = false;

      const cw = this.cfg.cw;
      const ch = this.cfg.ch;

      this.canvas.width = cw;
      this.canvas.height = ch;

      const ctx = this.canvas.getContext("2d");

      assert(ctx !== null);

      this.ctx = ctx;

      for (let i = 0; i < this.imageData.data.length; i += 1) {
        this.imageDataBuffer.data[i] = this.imageData.data[i];
      }

      this.imageData = this.ctx.getImageData(0, 0, cw, ch);
    }

    // Translate | scale image

    const dx = this.mouse.cx - this.mouse.px;
    const dy = this.mouse.cy - this.mouse.py;

    // What we're going to do when we need to redraw the canvas
    // this.ctx.putImageData();

    
    const cw = this.cfg.cw;
    const ch = this.cfg.ch;

    this.ctx.drawImage(this.canvas, dx, dy);
    this.imageData = this.ctx.getImageData(0, 0, cw, ch);

    // @ts-ignore
    if (!window.DEBUG_1) {
      this.cfg.id = Date.now();


      // Invalidate work
      this.stopCurrentWork();
  
      this.qtree.free();
  
      this.makeAllAvailableWorkersWork();
    }


  }

  public makeAllAvailableWorkersWork() {
    for (let i = 0; i < this.workers.length; i += 1) {
      if (this.isWorkerAvailable[i]) {
        this.requestJob(i);
      }
    }
  }

  private requestJob(workerIndex: number) {
    if (!this.isWorkerAvailable[workerIndex]) {
      return;
    }

    const node = this.qtree.getAvailableLeaf();

    if (node !== null) {
      this.isWorkerAvailable[workerIndex] = false;
      this.scheduleJob(workerIndex, node);
    }
  }

  private workerCallback(e: MessageEvent) {
    const msg: MessageFromSlaveToMaster = e.data;


    const workerIndex = msg.wi;

    // Mark worker as available.
    this.isWorkerAvailable[workerIndex] = true;

    const arr = new Uint8ClampedArray(msg.imgPart);

    if (msg.done && msg.id === this.cfg.id) {

      // TODO: the data received might be stale since the user might have moved 
      // the viewport and zoomed in or zoomed out.  Should we try to scale up or
      // scale down the area and redraw it?

      // TODO: if the data is stale that is being received, maybe discard it
      // or move it??


      /////////////////////////////
      // Draw region onto canvas //
      /////////////////////////////

      // TODO: reposition and rescale region.

      /** Width of canvas. */
      const w = this.cfg.cw;
      /** How many color channels to iterate through. */
      const channels = 4;

      const region = this.getRegion(msg.part);


      for (let y = 0; y < region.h; y += 1) {
        for (let x = 0; x < region.w; x += 1) {
          const canvas_index = x + region.x + (y + region.y) * w;
          const region_index = x + y * region.w;

          for (let ch = 0; ch < channels; ch += 1) {
            this.imageData.data[4 * canvas_index + ch] = arr[4 * region_index + ch];
          }
        }
      }

      // Paint
      this.ctx.putImageData(this.imageData, 0, 0);

      // this.ctx.drawImage(this.canvas, 0, 0);
    } else {
      // Aborted I guess
      
    }


    this.imageParts[workerIndex].arr = arr;
    this.requestJob(workerIndex);

    // Check if there is more work to do!
    this.makeAllAvailableWorkersWork();
  }

  stopCurrentWork() {
    for (let i = 0; i < this.workers.length; i += 1) {
      const worker = this.workers[i];

      const message: MessageFromMasterToSlave = {
        type: "stop",
      };

      worker.postMessage(message);
    }
  }

  private scheduleJob(workerIndex: number, node: Qtree) {
    let region = this.getRegion(node.getPath());
    let imagePart = this.imageParts[workerIndex];

    const message: MessageFromMasterToSlave = {
      type: "work",

      cfg: this.cfg,
      region: region,
      wi: workerIndex,
      part: node.getPath(),
      imagePart: {
        arr: imagePart.arr,
        buffer: imagePart.arr.buffer,
        data: imagePart.getAdditionalData()
      },
    };

    const worker = this.workers[workerIndex];

    worker.onmessage = (e) => { this.workerCallback(e); };
    worker.postMessage(message, [message.imagePart.buffer]);
  }

  private resizeCanvas(): void {
    this.cfg.cw = window.innerWidth;
    this.cfg.ch = window.innerHeight;

    this.canvasNeedsToUpdate = true;
    this.refresh();
  }
}
