class App {
  public VERBOSE: boolean = false;

  public initialized: boolean = false;
  public cfg: any; // object
  public workers: Array<Worker>;
  public workerScriptPath: string;
  public defaultNumberOfWorkers: number;
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public qtree: Qtree;
  public imageParts: Array<ImagePart>;
  public imageData: ImageData;
  public imageDataBuffer: ImageData;
  public updated: boolean;

  public workersAvailability: Array<boolean>;
  public timestamp: number;
  public canvasDown: boolean;
  public mouse: {
    origin: { x: number; y: number };
    previous: { x: number; y: number };
  };

  constructor() {
    // TypeScript, get off my back!
    this.canvas = <HTMLCanvasElement>document.getElementById("myCanvas");
    this.ctx = <CanvasRenderingContext2D>this.canvas.getContext("2d");
    this.workers = [];
    this.workerScriptPath = "js/worker.js";
    this.defaultNumberOfWorkers = 8;
    this.qtree = new Qtree();
    this.imageParts = [];
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.imageDataBuffer = this.ctx.createImageData(
      1,
      1
    );
    this.imageData = this.ctx.getImageData(
      0,
      0,
      1,
      1
    );
    this.updated = false;
    this.workersAvailability = [];
    this.timestamp = App.getTimestamp();
    this.canvasDown = false;
    this.mouse = {
      origin: {
        x: 0,
        y: 0
      },
      previous: {
        x: 0,
        y: 0
      }
    };

    // normal..
    this.init();
  }

  public init(): void {
    this.VERBOSE = false;
    this.updated = false;

    this.initialized = false;
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
          threshold: 15000,

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
      }
    };
    this.timestamp = App.getTimestamp();
    this.workers = [];
    this.workersAvailability = [];
    this.workerScriptPath = "js/worker.js";
    this.defaultNumberOfWorkers = 8;

    this.qtree = new Qtree();

    this.setWidth(window.innerWidth);
    this.setHeight(window.innerHeight);

    this.qtree.splitSubTree(3); // 2x2 (4)

    let w = Math.ceil(this.getWidth());
    let h = Math.ceil(this.getHeight());

    this.imageParts = [];

    for (let i = 0; i < this.defaultNumberOfWorkers; i += 1) {
      let imagePart = new ImagePart(w, h, 4);
      this.imageParts.push(imagePart);
    }

    for (let i = 0; i < this.defaultNumberOfWorkers; i++) {
      this.workers[i] = new Worker(this.workerScriptPath);
      this.workersAvailability.push(true);
    }

    let self = this;

    window.addEventListener(
      "resize",
      function() {
        self.resizeCanvas();
      },
      false
    );

    this.canvas = <HTMLCanvasElement>document.getElementById("myCanvas");
    this.canvasDown = false;
    this.mouse = {
      origin: {
        x: 0,
        y: 0
      },
      previous: {
        x: 0,
        y: 0
      }
    };

    this.canvas.addEventListener("mousedown", e => {
      let rect = this.canvas.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      this.mouse.origin.x = x;
      this.mouse.origin.y = y;

      this.mouse.previous.x = x;
      this.mouse.previous.y = y;

      // console.log('mouse down: ' + x + ", " + y);
      this.canvasDown = true;
    });

    this.canvas.addEventListener("mousemove", e => {
      let rect = this.canvas.getBoundingClientRect();
      let x = e.clientX - rect.left;
      let y = e.clientY - rect.top;
      if (this.canvasDown === true) {
        this.refresh();
        console.log(this.cfg.scene.point.re + ", " + this.cfg.scene.point.im);

        let ox = this.mouse.previous.x;
        let oy = this.mouse.previous.y;

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

        this.mouse.previous.x = x;
        this.mouse.previous.y = y;

        // console.log('mouse drag');
      }
    });

    this.canvas.addEventListener("mouseup", e => {
      // console.log('mouse up');
      this.canvasDown = false;
    });

    this.canvas.addEventListener("wheel", (e: WheelEvent) => {
      let dy = e.deltaY;

      let z = this.cfg.scene.zoom;

      let factor = 1;

      let magnitude = 0.2;

      if (dy > 0) {
        factor = 1 - magnitude;
      } else {
        factor = 1 + magnitude;
      }

      z *= factor;

      this.cfg.scene.zoom = z;
      this.refresh();
    });

    this.canvas.addEventListener("dblclick", e => {
      console.log("!");

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
    this.ctx = <CanvasRenderingContext2D>this.canvas.getContext("2d");

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
    this.initialized = true;
  }

  public isUpdated(): boolean {
    return this.updated;
  }

  public getRegion(
    code: string
  ): { x: number; y: number; w: number; h: number } {
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
          console.log("You fucked up!");
      }
    }

    return {
      x: x,
      y: y,
      w: w,
      h: h
    };
  }

  public setLatestTimestamp(): void {
    this.timestamp = new Date().getTime();
  }

  public getLatestTimestamp(): number {
    return this.timestamp;
  }

  public static getTimestamp(): number {
    return new Date().getTime();
  }

  public getWidth(): number {
    return this.cfg.width;
  }

  public getHeight(): number {
    return this.cfg.height;
  }

  public setWidth(width: number): void {
    this.cfg.width = width;
  }

  public setHeight(height: number): void {
    this.cfg.height = height;
  }

  public refresh(): void {
    this.canvas.width = this.getWidth();
    this.canvas.height = this.getHeight();
    // NOTE: this doesn't look super cool.
    this.ctx = <CanvasRenderingContext2D>this.canvas.getContext("2d");

    for (let i = 0; i < this.imageData.data.length; i += 1) {
      this.imageDataBuffer.data[i] = this.imageData.data[i];
    }

    this.imageData = this.ctx.getImageData(
      0,
      0,
      this.getWidth(),
      this.getHeight()
    );
    this.setLatestTimestamp();
    this.updated = true;

    this.ctx.putImageData(this.imageData, 0, 0);

    this.qtree.forAll(function(self) {
      self.flag = false;
    });

    for (let i = 0; i < this.workers.length; i += 1) {
      if (this.workersAvailability[i]) {
        this.requestJob(i);
      }
    }
  }

  public start(): void {
    if (!this.initialized) {
      this.init();
    }

    for (let i = 0; i < this.workers.length; i += 1) {
      this.requestJob(i);
    }
  }

  public requestJob(workerIndex: number): void {
    // Searches quad tree for a job

    let node = this.qtree;
    let running = true;
    let count = 0;
    let threshold = 10000;

    if (node.isLeaf() || node.getFlag()) {
      running = false;
    }

    while (running && count < threshold) {
      let n = node.children.length;
      count += 1;

      let idxList = [0, 1, 2, 3];

      Utils.shuffle(idxList);

      for (let i = 0; i < n; i += 1) {
        let child = node.children[idxList[i]];
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
      console.log("Something is not right");
    }

    if (!running && !node.flag) {
      node.setFlag(true); // claim this region
      this.workersAvailability[workerIndex] = false;
      this.scheduleJob(workerIndex, node);
    } else {
      if (this.VERBOSE) {
        console.log("No jobs for you");
      }
      this.updated = false;
    }
  }

  public workerCallback(e: MessageEvent): void {
    let message = e.data;

    console.log("Receiving part: " + message.part);

    if (this.VERBOSE) {
      console.log("Displaying [" + message.part + "]...");
    }

    let workerIndex = message.workerIndex;
    this.workersAvailability[workerIndex] = true;

    let arr = new Uint8ClampedArray(message.imgPart);

    let timestamp = message.timestamp;

    if (this.getLatestTimestamp() === timestamp) {
      let canvasWidth = this.getWidth();
      let channels = 4;
      let region = this.getRegion(message.part);

      for (let y = 0; y < region.h; y += 1) {
        for (let x = 0; x < region.w; x += 1) {
          let idxCanvas = 4 * (x + region.x + (y + region.y) * canvasWidth);
          let idxData = 4 * (x + y * region.w);
          for (let ch = 0; ch < channels; ch += 1) {
            this.imageData.data[idxCanvas + ch] = arr[idxData + ch];
          }
        }
      }

      // Paint
      this.ctx.putImageData(this.imageData, 0, 0);
    }

    this.imageParts[workerIndex].arr = arr;
    this.requestJob(workerIndex);
  }

  public scheduleJob(workerIndex: number, node: Qtree): void {
    let region = this.getRegion(node.path);
    let imagePart = this.imageParts[workerIndex];
    let message = {
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

    App.startJob(this.workers[workerIndex], message, transferList, function(e) {
      self.workerCallback(e);
    });
  }

  public static startJob(
    worker: Worker,
    message: Object,
    transferList: Transferable[],
    callback: (e: MessageEvent) => void
  ): void {
    // Message is an object with things that will be COPIED (minus those that
    // will be moved)
    // transferList is a list containing things that will be MOVED

    // This is what the worker sends back.
    worker.onmessage = callback;

    // This is what you want the worker to do.
    worker.postMessage(message, transferList);
  }

  public resizeCanvas(): void {
    this.setWidth(window.innerWidth);
    this.setHeight(window.innerHeight);
    this.updated = true;
    this.refresh();
  }
}

(function() {
  let app = new App();
  app.start();
})();
