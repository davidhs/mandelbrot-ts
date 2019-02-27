importScripts("utils.js");
importScripts("imagepart.js");

// FIELDS //

let region: {
  x: number;
  y: number;
  w: number;
  h: number;
};

let workerIndex: number;
let part: string;

let timestamp: number;

let cfg: {
  width: number;
  height: number;
  scene: {
    theta: number;
    ss: {};
    point: {
      re: number;
      im: number;
    };
    zoom: number;
    rendering: {
      threshold: number;
    };
  };
};

let threshold: number;

const il2 = 1 / Math.log(2);

let zoom: number;
let width: number;
let height: number;
let theta: number;
let wx0: number;
let wy0: number;

// RECEIVE MESSAGE //

let dataw: number; // data width
let datah: number; // data height
let datac: number; // data channels
let arr: Uint8ClampedArray; // data

onmessage = (e: MessageEvent): void => {
  let msg = e.data;

  cfg = msg.cfg;
  region = msg.region;
  workerIndex = msg.workerIndex;
  part = msg.part;
  dataw = msg.imagePart.data.width;
  datah = msg.imagePart.data.height;
  datac = msg.imagePart.data.channels;
  arr = new Uint8ClampedArray(msg.imagePart.buffer);
  timestamp = msg.timestamp;
  threshold = cfg.scene.rendering.threshold;

  zoom = cfg.scene.zoom;
  width = cfg.width;
  height = cfg.height;
  theta = cfg.scene.theta;
  wx0 = cfg.scene.point.re;
  wy0 = cfg.scene.point.im;

  build2();
};

let build2 = (): void => {
  console.log("Part: " + part + ", worker: " + workerIndex);
  // Loop iterators.

  let L = Math.min(cfg.width, cfg.height);
  let z0 = 1 / L;

  let z = zoom;

  let sx0 = width / 2;
  let sy0 = height / 2;

  let cos = Math.cos(theta);
  let sin = Math.sin(theta);

  const x1 = region.x;
  const x2 = region.x + region.w;

  const y1 = region.y;
  const y2 = region.y + region.h;

  const ESCAPE_THRESHOLD = 2147483647;
  let rgb = [0, 0, 0];

  let v = Math.round(Math.random() * 255);
  let idx4 = 0;

  for (let y = y1; y < y2; y += 1) {
    let sdy = y - sy0;
    let wdy = -z * z0 * sdy;

    for (let x = x1; x < x2; x += 1) {
      let sdx = x - sx0;
      let wdx = z * z0 * sdx;

      let wrdx = cos * wdx - sin * wdy;
      let wrdy = sin * wdx + cos * wdy;

      let wx = wx0 + wrdx;
      let wy = wy0 + wrdy;

      let escaped = false;

      let re0 = wx;
      let im0 = wy;

      let re = wx;
      let im = wy;

      let s1 = 0;
      let s2 = 0;

      let t = 0;

      for (; t < threshold && !escaped; t += 1) {
        s1 = re * re;
        s2 = im * im;

        im = 2 * re * im + im0;
        re = s1 - s2 + re0;

        if (s1 + s2 > ESCAPE_THRESHOLD) {
          escaped = true;
        }
      }

      let nu = il2 * Math.log(Math.log(s1 + s2));

      let cv = Math.log(t + 1 - nu);

      let hue = cv;

      hue = 0;
      let saturation = 1;
      let luminance = escaped ? 0.5 : 0;

      luminance = escaped ? 1 - (Math.sin(cv) + 1) / 2 : 0;

      hue = Math.abs(hue) > 1 ? hue % 1 : hue;
      saturation = Math.abs(saturation) > 1 ? saturation % 1 : saturation;
      luminance = Math.abs(luminance) > 1 ? luminance % 1 : luminance;

      Utils.hslToRgbRW(hue, saturation, luminance, rgb);

      arr[idx4] = v;
      arr[idx4 + 1] = v;
      arr[idx4 + 2] = v;
      arr[idx4 + 3] = 255;

      arr[idx4] = rgb[0];
      arr[idx4 + 1] = rgb[1];
      arr[idx4 + 2] = rgb[2];
      arr[idx4 + 3] = 255;

      idx4 += 4;
    }
  }

  let result = {
    part: part,
    imgPart: arr.buffer,
    workerIndex: workerIndex,
    timestamp: timestamp
  };

  postMessage(result, [result.imgPart]);
};
