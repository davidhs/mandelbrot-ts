import * as Utils from "../common/utils.js";
import { MessageFromMasterToSlave, MessageFromSlaveToMaster } from "../common/types";


// Constants
// const BAILOUT_RADIUS = 2147483647;
const BAILOUT_RADIUS = 65536;





// Coloring method

const THEME_RAINBOW = 10;
const THEME_CONTOURED_RAINBOW = 11;
const THEME_FIRE = 12;

const THEME: number = THEME_RAINBOW;

/**
 * Fractual equivalence given tolerance
 * 
 * @param a 
 * @param b 
 * @param t 
 */
function feq(a: number, b: number, t: number) {
  let d = a - b;
  if (d < 0) d = -d;
  return d <= t;
}




function * processMaker(msg: MessageFromMasterToSlave): Generator<boolean, boolean, boolean> {

  const cfg = msg.cfg;
  const region = msg.region;
  const workerIndex = msg.workerIndex;
  const part = msg.part;
  const arr = new Uint8ClampedArray(msg.imagePart.buffer);  // data
  const timestamp  = msg.timestamp;
  
  /** What is the max. iteration we're willing to tolerate. */
  const max_iteration = cfg.scene.rendering.threshold;
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
  const x2 = region.x + region.w;

  const y1 = region.y;
  const y2 = region.y + region.h;

  const rgb = [0, 0, 0];

  let idx4 = 0;

  let pixelCount = 0;
  const pixelCountYield = 100;

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

      /** What iteration we are on (fractional)? */
      let iteration = 0;

      /////////////////////////////
      // Cardoid / bulb checking //
      /////////////////////////////
      {
        const x = re;
        const y = im;

        const y_sq = y * y;

        const _p1 = x - (1.0 / 4.0);
        const p = Math.sqrt(_p1 * _p1 + y_sq);

        // Check if we're in the cardioid.
        if (x <= p - 2.0 * p * p + (1.0 / 4.0)) {
          iteration = max_iteration; // Do early rejection.
        }

        const x_inc = x + 1;

        // Check if we're inside period-2 bulb.
        if (x_inc * x_inc + y_sq <= (1.0 / 16.0)) {
          iteration = max_iteration; // Do early rejection.
        }
      }

      //////////////////////////////////////////
      // Check if we're in the Mandelbrot set //
      //////////////////////////////////////////

      /** re * re */
      let re_sq = re * re;
      /** im * im */
      let im_sq = im * im;

      // periodicity checking

      let re_old = 0;
      let im_old = 0;
      let period = 0;
      const period_limit = 100;

      // Implementation of an optimized escape time algorithm.
      while (re_sq + im_sq <= BAILOUT_RADIUS && iteration < max_iteration) {
        im = 2 * re * im + im0;
        re = re_sq - im_sq + re0;

        re_sq = re * re;
        im_sq = im * im;

        iteration += 1

        const feq_t = 0.000001;

        if (feq(re, re_old, feq_t) && feq(im, im_old, feq_t)) {
          // We're inside the Mandelbrot set
          iteration = max_iteration;
          break;
        }

        period += 1;
        if (period > period_limit) {
          period = 0;

          re_old = re;
          im_old = im;
        }
      }

      /** 
       * A boolean whether we escaped, i.e. verified we're not part of the
       * mandelbrot set.
       */
      const escaped = iteration < max_iteration;


      // To avoid floating point issues with points inside the set?
      /*
      if (iteration < max_iteration) {
        const nu = Math.log2(Math.log2(re_sq + im_sq)) - 1.0;

        iteration = iteration + 1 - nu;
      }
      */


      //////////////////////////////
      // Determine color of pixel //
      //////////////////////////////

      

      if (THEME === THEME_FIRE) {
        const nu = Math.log2(Math.log2(re_sq + im_sq)) - 1.0;

        const cv = Math.log(iteration + 1 - nu);

        let hue = cv;

        hue = 0;
        let saturation = 1;
        let luminance = escaped ? 0.5 : 0;

        luminance = escaped ? 1 - (Math.sin(cv) + 1) / 2 : 0;

        hue = Math.abs(hue) > 1 ? hue % 1 : hue;
        saturation = Math.abs(saturation) > 1 ? saturation % 1 : saturation;
        luminance = Math.abs(luminance) > 1 ? luminance % 1 : luminance;

        Utils.hslToRgbRW(hue, saturation, luminance, rgb);
      } else if (THEME === THEME_CONTOURED_RAINBOW) {
        // TODO: I don't know what unbounded here means.
        const unbounded = BAILOUT_RADIUS;
        
        let hue = Math.log(iteration);
        let saturation = 1;
        let luminance = escaped ? 0.5 * unbounded : 0.0;
        hue = Math.abs(hue) > 1 ? hue % 1 : hue;
        saturation = Math.abs(saturation) > 1 ? saturation % 1 : saturation;
        luminance = Math.abs(luminance) > 1 ? luminance % 1 : luminance;

        Utils.hslToRgbRW(hue, saturation, luminance, rgb);
      } else if (THEME === THEME_RAINBOW) {




        const nu = Math.log2(Math.log2(re_sq + im_sq)) - 1.0;

        const cv = Math.log(iteration + 1 - nu);

        let hue = cv;

        let saturation = 1;
        let luminance = escaped ? 0.5 : 0.0;

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

      arr[idx4 + 0] = rgb[0];
      arr[idx4 + 1] = rgb[1];
      arr[idx4 + 2] = rgb[2];
      arr[idx4 + 3] = 255;


      pixelCount += 1;

      if (pixelCount % pixelCountYield === 0) {
        yield true;
      }
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

  
  output(result);

  return false;
};










function input(msg: MessageFromMasterToSlave) {

  const process = processMaker(msg);

  while (process.next().value) {}
}


function output(msg: MessageFromSlaveToMaster) {
  // @ts-ignore
  postMessage(msg, [msg.imgPart]);
}


// @ts-ignore
onmessage = (e: MessageEvent): void => {
  const msg: MessageFromMasterToSlave = e.data;

  input(msg);
}
