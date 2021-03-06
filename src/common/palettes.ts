import Gradient from "./Gradient.js";
import { hslToRgbRW, hex2rgba } from "./utils.js";

type PaletteFunction = (escaped: boolean, iterations: number, rgba: number[]) => void;

export const rainbow: PaletteFunction = (escaped: boolean, iterations: number, rgba: number[]) => {
  let hue = Math.log2(Math.abs(iterations));

  let saturation = 1;
  let luminance = escaped ? 0.5 : 0.0;

  hue = Math.abs(hue) > 1 ? hue % 1 : hue;
  saturation = Math.abs(saturation) > 1 ? saturation % 1 : saturation;
  luminance = Math.abs(luminance) > 1 ? luminance % 1 : luminance;

  hslToRgbRW(hue, saturation, luminance, rgba);

  rgba[0] /= 255.0;
  rgba[1] /= 255.0;
  rgba[2] /= 255.0;
  rgba[3] = 1.0;
}

export const fire: PaletteFunction = (escaped: boolean, iterations: number, rgba: number[]) => {
  if (!escaped) {
    rgba[0] = 0.0;
    rgba[1] = 0.0;
    rgba[2] = 0.0;
    rgba[3] = 1.0;

    return;
  }

  const cv = Math.log2(Math.abs(iterations));

  const luminance = 1 - (Math.sin(cv) + 1) / 2;
  const hue = 0.0;
  const saturation = 1.0;

  hslToRgbRW(hue, saturation, luminance, rgba);

  rgba[0] /= 255.0;
  rgba[1] /= 255.0;
  rgba[2] /= 255.0;
  rgba[3] = 1.0;
}

export const redBlue: PaletteFunction = (() => {
  const gradient = new Gradient();
  gradient.setPositionColor(0.0, [1.0, 0.0, 0.0]);
  gradient.setPositionColor(0.5, [0.0, 0.0, 1.0]);

  const palette = (escaped: boolean, iterations: number, rgba: number[]) => {

    if (!escaped) {
      rgba[0] = 0.0;
      rgba[1] = 0.0;
      rgba[2] = 0.0;
      rgba[3] = 1.0;
      return;
    }

    iterations = Math.log2(Math.abs(iterations));

    gradient.getColorAt(iterations, rgba);
  };

  return palette;
})();

export const unnamed1: PaletteFunction = (() => {
  const gradient = new Gradient();

  gradient.setPositionColor(0.00, hex2rgba("#52ddac"));
  gradient.setPositionColor(0.28, hex2rgba("#a1cc7e"));
  gradient.setPositionColor(0.74, hex2rgba("#d897be"));

  return (escaped: boolean, iterations: number, rgba: number[]) => {
    if (!escaped) {
      rgba[0] = 0.0;
      rgba[1] = 0.0;
      rgba[2] = 0.0;
      rgba[3] = 1.0;
      return;
    }

    iterations = Math.log2(Math.abs(iterations));

    gradient.getColorAt(iterations, rgba);
  };
})();

export const softrainbow: PaletteFunction = (() => {
  const gradient = new Gradient();

  gradient.setPositionColor(0.00, hex2rgba("#ff7a7a"));
  gradient.setPositionColor(0.11, hex2rgba("#e0b662"));
  gradient.setPositionColor(0.28, hex2rgba("#b6db67"));
  gradient.setPositionColor(0.45, hex2rgba("#8fea85"));
  gradient.setPositionColor(0.63, hex2rgba("#62cbe0"));
  gradient.setPositionColor(0.78, hex2rgba("#99a3ff"));
  gradient.setPositionColor(0.90, hex2rgba("#d981ef"));

  return (escaped: boolean, iterations: number, rgba: number[]) => {
    if (!escaped) {
      rgba[0] = 0.0;
      rgba[1] = 0.0;
      rgba[2] = 0.0;
      rgba[3] = 1.0;
      return;
    }

    iterations = Math.log2(Math.abs(iterations));
    iterations = iterations * 0.5;

    gradient.getColorAt(iterations, rgba);
  };
})();

export const wiki: PaletteFunction = (() => {
  const gradient = new Gradient();
  gradient.setPositionColor(0.0000, [0 / 255, 7 / 255, 100 / 255]);
  gradient.setPositionColor(0.1600, [32 / 255, 107 / 255, 203 / 255]);
  gradient.setPositionColor(0.4200, [237 / 255, 255 / 255, 255 / 255]);
  gradient.setPositionColor(0.6425, [255 / 255, 170 / 255, 0 / 255]);
  gradient.setPositionColor(0.8575, [0 / 255, 2 / 255, 0 / 255]);

  const palette = (escaped: boolean, iterations: number, rgba: number[]) => {
    if (!escaped) {
      rgba[0] = 0.0;
      rgba[1] = 0.0;
      rgba[2] = 0.0;
      rgba[3] = 1.0;
      return;
    }

    iterations = Math.log2(Math.abs(iterations));

    gradient.getColorAt(iterations, rgba);
  };

  return palette;
})();

export const fire2: PaletteFunction = (() => {
  const gradient = new Gradient();

  gradient.setPositionColor(0.00, hex2rgba("#ffd400"));
  gradient.setPositionColor(0.21, hex2rgba("#ff7716"));
  gradient.setPositionColor(0.43, hex2rgba("#e00b0b"));
  gradient.setPositionColor(0.66, hex2rgba("#840e0e"));

  gradient.setPositionColor(0.87, hex2rgba("#000000"));

  return (escaped: boolean, iterations: number, rgba: number[]) => {
    if (!escaped) {
      rgba[0] = 0.0;
      rgba[1] = 0.0;
      rgba[2] = 0.0;
      rgba[3] = 1.0;
      return;
    }

    iterations = Math.log2(Math.abs(iterations));

    gradient.getColorAt(iterations, rgba);
  };
})();
