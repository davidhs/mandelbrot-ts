export type Region = {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Config = {
  width: number;
  height: number;
  scene: {
    theta: number;
    point: {
      re: number;
      im: number;
    };
    zoom: number;
    rendering: {
      threshold: number;

      // Supersampling
      ss: {
        hor: {
          min: number;
          max: number;
          splits: number;
        },
        ver: {
          min: number;
          max: number;
          splits: number;
        }
      }
    };
  },
  // These values are precomputed by the master.
  _precomputed: {
    z0: number,
    sx0: number,
    sy0: number,
    cos: number,
    sin: number,
  },
};


export type MessageFromMasterToSlave = {
  cfg: Config,
  region: Region,
  workerIndex: number,
  part: string,
  imagePart: {
    arr: Uint8ClampedArray,
    buffer: Uint8ClampedArray["buffer"],
    data: {
      width: number,
      height: number,
      channels: number,
    },
  },
  timestamp: number,
};

export type MessageFromSlaveToMaster = {};