import * as Utils from "../common/utils.js";
import { MessageFromMasterToSlave, MessageFromSlaveToMaster } from "../common/types";


// Constants
const INV_NAT_LOG_2 = 1.0 / Math.log(2.0);
const ESCAPE_THRESHOLD = 2147483647;
const ONE_FOURTH = 1.0 / 4.0;
const ONE_SIXTEENTH = 1.0 / 16.0;


onmessage = (e: MessageEvent): void => {
  const msg: MessageFromMasterToSlave = e.data;

  const cfg = msg.cfg;
  const region = msg.region;
  const workerIndex = msg.workerIndex;
  const part = msg.part;
  const arr = new Uint8ClampedArray(msg.imagePart.buffer);  // data
  const timestamp  = msg.timestamp;
  
  const threshold = cfg.scene.rendering.threshold;
  const zoom = cfg.scene.zoom;
  const wx0 = cfg.scene.point.re;
  const wy0 = cfg.scene.point.im;

  /////////////////////////////////////
  // Render region of Mandelbrot set //
  /////////////////////////////////////

  const z0 = cfg._precomputed.z0;

  const z = zoom;

  const sx0 = cfg._precomputed.sx0;

  const sy0 = cfg._precomputed.sy0;

  const cos = cfg._precomputed.cos;

  const sin = cfg._precomputed.sin;

  const x1 = region.x;

  // TODO: this could be moved into the master thread, since each region is
  // mostly of equal size, but I'm not 100% sure, so I'm going to leave this
  // in here.
  const x2 = region.x + region.w;

  const y1 = region.y;

  const y2 = region.y + region.h;

  
  const rgb = [0, 0, 0];

  let idx4 = 0;

  for (let y = y1; y < y2; y += 1) {
    const sdy = y - sy0;
    const wdy = -z * z0 * sdy;

    for (let x = x1; x < x2; x += 1, idx4 += 4) {
      const sdx = x - sx0;
      const wdx = z * z0 * sdx;

      const wrdx = cos * wdx - sin * wdy;
      const wrdy = sin * wdx + cos * wdy;

      const wx = wx0 + wrdx;
      const wy = wy0 + wrdy;

      const re0 = wx;
      const im0 = wy;

      /////////////////////
      // Comoplex number //
      /////////////////////

      /** Real part of the complex number. */
      let re = wx;

      /** Imaginary part of the complex number. */
      let im = wy;

      /** Threshold iterator */
      let t = 0;

      /////////////////////////////
      // Cardoid / bulb checking //
      /////////////////////////////
      {
        const x = re;
        const y = im;

        const y_sq = y * y;

        const _p1 = x - ONE_FOURTH;
        const p = Math.sqrt(_p1 * _p1 + y_sq);

        // Check if we're in the cardioid.
        if (x <= p - 2.0 * p * p + ONE_FOURTH) {
          t = threshold; // Do early rejection.
        }

        const x_inc = x + 1;

        // Check if we're inside period-2 bulb.
        if (x_inc * x_inc + y_sq <= ONE_SIXTEENTH) {
          t = threshold; // Do early rejection.
        }
      }

      //////////////////////////////////////////
      // Check if we're in the Mandelbrot set //
      //////////////////////////////////////////

      let s1 = 0;
      let s2 = 0;

      /** Escaped */
      let escaped = false;

      // Implementation of an optimized escape time algorithm.
      for (; t < threshold && !escaped;) {
        s1 = re * re;
        s2 = im * im;

        im = 2 * re * im + im0;
        re = s1 - s2 + re0;

        escaped = s1 + s2 > ESCAPE_THRESHOLD;

        t += 1
      }

      //////////////////////////////
      // Determine color of pixel //
      //////////////////////////////

      if (false) {
        const nu = INV_NAT_LOG_2 * Math.log(Math.log(s1 + s2));

        const cv = Math.log(t + 1 - nu);

        let hue = cv;

        hue = 0;
        let saturation = 1;
        let luminance = escaped ? 0.5 : 0;

        luminance = escaped ? 1 - (Math.sin(cv) + 1) / 2 : 0;

        hue = Math.abs(hue) > 1 ? hue % 1 : hue;
        saturation = Math.abs(saturation) > 1 ? saturation % 1 : saturation;
        luminance = Math.abs(luminance) > 1 ? luminance % 1 : luminance;

        Utils.hslToRgbRW(hue, saturation, luminance, rgb);
      } else if (false) {
        // TODO: I don't know what unbounded here means.
        const unbounded = ESCAPE_THRESHOLD;
        const iterations = t;
        let hue = Math.log(iterations);
        let saturation = 1;
        let luminance = 0.5 * unbounded;
        hue = Math.abs(hue) > 1 ? hue % 1 : hue;
        saturation = Math.abs(saturation) > 1 ? saturation % 1 : saturation;
        luminance = Math.abs(luminance) > 1 ? luminance % 1 : luminance;

        Utils.hslToRgbRW(hue, saturation, luminance, rgb);
      } else if (true) {
        const nu = INV_NAT_LOG_2 * Math.log(Math.log(s1 + s2));

        const cv = Math.log(t + 1 - nu);

        let hue = cv;

        let saturation = 1;
        let luminance = escaped ? 0.5 : 0;

        hue = Math.abs(hue) > 1 ? hue % 1 : hue;
        saturation = Math.abs(saturation) > 1 ? saturation % 1 : saturation;
        luminance = Math.abs(luminance) > 1 ? luminance % 1 : luminance;

        Utils.hslToRgbRW(hue, saturation, luminance, rgb);
      } else {
        throw new Error("Whoops!");
      }

      ////////////////////
      // Color in pixel //
      ////////////////////

      arr[idx4] = rgb[0];
      arr[idx4 + 1] = rgb[1];
      arr[idx4 + 2] = rgb[2];
      arr[idx4 + 3] = 255;
    }
  }

  const result: MessageFromSlaveToMaster = {
    part: part,
    imgPart: arr.buffer,
    workerIndex: workerIndex,
    timestamp: timestamp,

    // Position
    re: cfg.scene.point.re,
    im: cfg.scene.point.im,
    zoom: cfg.scene.zoom,
  };

  postMessage(result, [result.imgPart]);
};
