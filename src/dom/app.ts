/// <reference lib="esnext" />
/// <reference lib="dom" />

import Qtree from "../common/qtree.js";
import ImagePart from "../common/imagepart.js";
import Mouse from "../common/mouse.js";
import { assert } from "../common/utils.js";
import { Config, MessageFromMasterToSlave, MessageFromSlaveToMaster, Region } from "../common/types";

const WEB_WORKER_PATH = "js/webworker/worker.js";
const DEFAULT_NUMBER_OF_WORKS = 8;



function getRegion(canvas_width: number, canvas_height: number, pathcode: string): Region {
  let x = 0;
  let y = 0;
  let w = canvas_width;
  let h = canvas_height;

  for (let i = 0; i < pathcode.length; i += 1) {
    const c = pathcode.charAt(i);

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

  return { x, y, w, h };
}


export default class App {
  #cfg: Config; // object
  #workers: Array<Worker>;
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  #qtree: Qtree;
  #imageParts: Array<ImagePart>;
  #imageData: ImageData;
  #imageDataBuffer: ImageData;
  #isWorkerAvailable: Array<boolean>;
  #mouse: Mouse;
  #canvasNeedsToUpdate: boolean;
  #dx: number;
  #dy: number;
  #dw: number;
  #dh: number;
  #back_canvas: HTMLCanvasElement;
  #back_ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.#back_canvas = document.createElement("canvas");
    {
      const back_ctx = this.#back_canvas.getContext("2d");
      assert(back_ctx !== null);
      this.#back_ctx = back_ctx;
    }

    this.#dx = 0;
    this.#dy = 0;
    this.#dw = 0;
    this.#dh = 0;


    
    this.#workers = [];
    
    this.#qtree = new Qtree();
    // 1 -> progress too slow (not enough regions)
    // 2 -> could be a little bit fast (not enough regions)
    // 3 -> maybe a bit more?
    // 4 -> good
    // 5 -> slower than 4
    // 6 -> too slow, too much overhead (too many regions)
    this.#qtree.splitSubTree(4); // 2x2 (4)


    this.#imageParts = [];
    
    this.#canvasNeedsToUpdate = true;

    
    this.#isWorkerAvailable = [];
    this.#mouse = new Mouse();

    {
      const cfg: Config = {
        id: Date.now(),
        cw: window.innerWidth,
        ch: window.innerHeight,
        re: -0.5,
        im: +0.0,
        z: 4,
        max_iter: 30000,
      };

      this.#cfg = cfg;
    }

    this.#canvas = canvas;
    this.#canvas.width = this.#cfg.cw;
    this.#canvas.height = this.#cfg.ch;
    {
      const ctx = this.#canvas.getContext("2d");
      assert(ctx !== null);
      this.#ctx = ctx;
    }

    {
      const cw = Math.ceil(this.#cfg.cw);
      const ch = Math.ceil(this.#cfg.ch);
  
      for (let i = 0; i < DEFAULT_NUMBER_OF_WORKS; i += 1) {
        this.#imageParts.push(new ImagePart(cw, ch, 4));
      }
    }

    for (let i = 0; i < DEFAULT_NUMBER_OF_WORKS; i += 1) {
      this.#workers.push(new Worker(WEB_WORKER_PATH, { type: "module" }));
      this.#isWorkerAvailable.push(true);
    }


    this.#imageDataBuffer = this.#ctx.createImageData(this.#cfg.cw, this.#cfg.ch);

    this.#imageData = this.#ctx.getImageData(
      0,
      0,
      this.#cfg.cw,
      this.#cfg.ch
    );

    ////////////////////////////////
    // Add window resize listener //
    ////////////////////////////////

    window.addEventListener("resize", () => {
      this.#cfg.cw = window.innerWidth;
      this.#cfg.ch = window.innerHeight;
  
      this.#canvasNeedsToUpdate = true;
      this.refresh();
     }, false);

    ///////////////////////////////////
    // Add event listeners to canvas //
    ///////////////////////////////////

    this.#canvas.addEventListener("mousedown", (e) => {
      this.#mouse.consume(e);
    });

    this.#canvas.addEventListener("mousemove", (e) => {
      const mouse = this.#mouse;
      const cfg = this.#cfg;

      mouse.consume(e);

      if (mouse.mbdr) {
        const canvas_dx = mouse.px - mouse.cx;
        const canvas_dy = mouse.py - mouse.cy;

        const re_old = cfg.re;
        const im_old = cfg.im;

        // -----------------------------------------------------------------------

        const [re_delta, im_delta] = this.canvasDeltaToMandelbrotDelta(canvas_dx, canvas_dy);

        const re_new = re_old + re_delta;
        const im_new = im_old + im_delta;

        // -----------------------------------------------------------------------

        const cw = cfg.cw;
        const ch = cfg.ch;
  
        const f = 1.0; // old_zoom / new_zoom;
        
        const dw = f * cw;
        const dh = f * ch;
  
        const [pan_x, pan_y] = this.mandelbrotDeltaToCanvasDelta(re_old - re_new, im_old - im_new);
  
        const dx = pan_x + (cw - dw) / 2;
        const dy = pan_y + (ch - dh) / 2;
  
  
        this.#dw = dw;
        this.#dh = dh;
  
        this.#dx = dx;
        this.#dy = dy;

        // -----------------------------------------------------------------------

        this.#cfg.re = re_new;
        this.#cfg.im = im_new;

        this.refresh();
      }
    });

    this.#canvas.addEventListener("mouseup", (e) => {
      this.#mouse.consume(e);
    });

    this.#canvas.addEventListener("wheel", (e) => {
      this.#mouse.consume(e);

      // Compute new zoom

      const old_zoom = this.#cfg.z;

      const magnitude = 0.2;
      const sign = this.#mouse.wdy > 0 ? -1.0 : 1.0;

      const factor = 1 - sign * magnitude;

      const new_zoom = old_zoom * factor;

      // -----------------------------------------------------------------------
      // Move

      const re_old = this.#cfg.re;
      const im_old = this.#cfg.im;

      const canvas_x_old = this.#mouse.x;
      const canvas_y_old = this.#mouse.y;

      const canvas_width = this.#cfg.cw;
      const canvas_height = this.#cfg.ch;

      // Distance from center of canvas
      const canvas_dx = canvas_x_old - canvas_width / 2;
      const canvas_dy = canvas_y_old - canvas_height / 2;

      // Center canvas to mouse pointer
      const [re_center, im_center] = this.canvasToMandelbrot(canvas_x_old, canvas_y_old);

      // Apply (re, im)
      this.#cfg.re = re_center;
      this.#cfg.im = im_center;

      // Apply zoom
      this.#cfg.z = new_zoom;

      // Move canvas
      const [re_delta, im_delta] = this.canvasDeltaToMandelbrotDelta(-canvas_dx, -canvas_dy);

      const re_new = re_center + re_delta;
      const im_new = im_center + im_delta;

      // -----------------------------------------------------------------------

      const cw = this.#cfg.cw;
      const ch = this.#cfg.ch;

      const f = old_zoom / new_zoom;
      
      const dw = f * cw;
      const dh = f * ch;

      const [pan_x, pan_y] = this.mandelbrotDeltaToCanvasDelta(re_old - re_new, im_old - im_new);

      const dx = pan_x + (cw - dw) / 2;
      const dy = pan_y + (ch - dh) / 2;


      this.#dw = dw;
      this.#dh = dh;

      this.#dx = dx;
      this.#dy = dy;

      // -----------------------------------------------------------------------

      this.#cfg.re = re_new;
      this.#cfg.im = im_new;

      this.refresh();

      e.preventDefault();
    });

    this.#canvas.addEventListener("dblclick", (e) => {
      this.#mouse.consume(e);

      const canvas_x = this.#mouse.x;
      const canvas_y = this.#mouse.y;

      const [re, im] = this.canvasToMandelbrot(canvas_x, canvas_y);

      this.#cfg.re = re;
      this.#cfg.im = im;

      this.refresh();
    });

    this.refresh();
  }

  private canvasDeltaToMandelbrotDelta(canvas_dx: number, canvas_dy: number) {
    const canvas_width = this.#cfg.cw;
    const canvas_height = this.#cfg.ch;

    const canvas_minimum_dimension = Math.min(canvas_width, canvas_height);
    const aspect_ratio_scale = 1.0 / canvas_minimum_dimension;

    const zoom = this.#cfg.z;

    const re_delta = canvas_dx * (+ zoom * aspect_ratio_scale);
    const im_delta = canvas_dy * (- zoom * aspect_ratio_scale);

    return [re_delta, im_delta];
  }

  private mandelbrotDeltaToCanvasDelta(re_delta: number, im_delta: number) {
    const canvas_width = this.#cfg.cw;
    const canvas_height = this.#cfg.ch;

    const canvas_minimum_dimension = Math.min(canvas_width, canvas_height);
    const aspect_ratio_scale = 1.0 / canvas_minimum_dimension;

    const zoom = this.#cfg.z;

    const canvas_dx = +1.0 * re_delta / (zoom * aspect_ratio_scale);
    const canvas_dy = -1.0 * im_delta / (zoom * aspect_ratio_scale);

    return [canvas_dx, canvas_dy];
  }


  private canvasToMandelbrot(canvas_x: number, canvas_y: number) {
    const canvas_width = this.#cfg.cw;
    const canvas_height = this.#cfg.ch;

    const re_old = this.#cfg.re;
    const im_old = this.#cfg.im;

    const canvas_dx = canvas_x - canvas_width / 2;
    const canvas_dy = canvas_y - canvas_height / 2;

    const [re_delta, im_delta] = this.canvasDeltaToMandelbrotDelta(canvas_dx, canvas_dy);

    const re_new = re_old + re_delta;
    const im_new = im_old + im_delta;

    return [re_new, im_new];
  }

  private mandelbrotToCanvas(re: number, im: number) {
    // TODO: I'm not 100% sure this code works correctly.
    const canvas_x_old = this.#mouse.cx;
    const canvas_y_old = this.#mouse.cy;

    const re_canvas = this.#cfg.re;
    const im_canvas = this.#cfg.im;

    const re_delta = im - im_canvas;
    const im_delta = re - re_canvas;

    const [canvas_dx, canvas_dy] = this.mandelbrotDeltaToCanvasDelta(re_delta, im_delta);

    const canvas_x_new = canvas_x_old + canvas_dx;
    const canvas_y_new = canvas_y_old + canvas_dy;

    return [canvas_x_new, canvas_y_new];
  }


  /**
   * I guess any time you make any change, you need to call this function
   * to rerender.
   */
  private refresh() {
    // Canvas width / height we want
    const cw = this.#cfg.cw;
    const ch = this.#cfg.ch;

    if (this.#canvasNeedsToUpdate) {
      this.#canvasNeedsToUpdate = false;

      this.#canvas.width = cw;
      this.#canvas.height = ch;
      
      // Is this OK?
      this.#dw = cw;
      this.#dh = ch;

      const ctx = this.#canvas.getContext("2d");

      assert(ctx !== null);

      this.#ctx = ctx;

      for (let i = 0; i < this.#imageData.data.length; i += 1) {
        this.#imageDataBuffer.data[i] = this.#imageData.data[i];
      }

      this.#imageData = this.#ctx.getImageData(0, 0, cw, ch);

      this.#back_canvas.width = cw;
      this.#back_canvas.height = ch;

      const back_ctx = this.#back_canvas.getContext("2d");
      assert(back_ctx !== null);
      this.#back_ctx = back_ctx;
    }

    // Move and scale the previous image

    this.#back_ctx.clearRect(0, 0, cw, ch);

    // Draw to back canvas
    this.#back_ctx.drawImage(
      this.#canvas, 
      0, 0, cw, ch, 
      this.#dx, this.#dy, this.#dw, this.#dh
    );

    // Clear front canvas
    this.#ctx.clearRect(0, 0, cw, ch);

    // Draw from back canvas to front canvas.
    this.#ctx.drawImage(this.#back_canvas, 0, 0);

    this.#imageData = this.#ctx.getImageData(0, 0, cw, ch);
    // this.ctx.putImageData(this.imageData, 0, 0);

    this.#cfg.id = Date.now();
    this.stopCurrentWork();
    this.#qtree.free();
    this.makeAllAvailableWorkersWork();
  }

  public makeAllAvailableWorkersWork() {
    for (let i = 0; i < this.#workers.length; i += 1) {
      if (this.#isWorkerAvailable[i]) {
        this.requestJob(i);
      }
    }
  }

  private requestJob(workerIndex: number) {
    if (!this.#isWorkerAvailable[workerIndex]) {
      return;
    }

    const node = this.#qtree.getAvailableLeaf();

    if (node !== null) {
      this.#isWorkerAvailable[workerIndex] = false;
      this.scheduleJob(workerIndex, node);
    }
  }

  private workerCallback(e: MessageEvent) {
    const msg: MessageFromSlaveToMaster = e.data;

    const workerIndex = msg.wi;

    // Mark worker as available.
    this.#isWorkerAvailable[workerIndex] = true;

    const arr = new Uint8ClampedArray(msg.imgPart);

    if (msg.done && msg.id === this.#cfg.id) {
      const region = getRegion(this.#cfg.cw, this.#cfg.ch, msg.part);

      for (let y = 0; y < region.h; y += 1) {
        for (let x = 0; x < region.w; x += 1) {
          const canvas_index = x + region.x + (y + region.y) * this.#cfg.cw;
          const region_index = x + y * region.w;

          for (let ch = 0; ch < 4; ch += 1) {
            this.#imageData.data[4 * canvas_index + ch] = arr[4 * region_index + ch];
          }
        }
      }

      this.#ctx.putImageData(this.#imageData, 0, 0);
    }

    this.#imageParts[workerIndex].arr = arr;
    this.requestJob(workerIndex);

    // Check if there is more work to do!
    this.makeAllAvailableWorkersWork();
  }

  private stopCurrentWork() {
    for (let i = 0; i < this.#workers.length; i += 1) {
      const worker = this.#workers[i];

      const message: MessageFromMasterToSlave = {
        type: "stop",
      };

      worker.postMessage(message);
    }
  }

  private scheduleJob(workerIndex: number, node: Qtree) {
    const region = getRegion(this.#cfg.cw, this.#cfg.ch, node.getPath());
    const imagePart = this.#imageParts[workerIndex];

    const message: MessageFromMasterToSlave = {
      type: "work",

      cfg: this.#cfg,
      region: region,
      wi: workerIndex,
      part: node.getPath(),
      imagePart: {
        arr: imagePart.arr,
        buffer: imagePart.arr.buffer,
        data: imagePart.getAdditionalData()
      },
    };

    const worker = this.#workers[workerIndex];

    worker.onmessage = (e) => { this.workerCallback(e); };
    worker.postMessage(message, [message.imagePart.buffer]);
  }

}
