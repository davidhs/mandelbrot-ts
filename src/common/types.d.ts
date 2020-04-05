export type Region = {
  x: number;
  y: number;

  w: number;
  h: number;
}

// Rename this to objective
export type Config = {
  cw: number, // canvas width
  ch: number, // canvas height
  
  re: number,
  im: number,

  z: number, // zoom

  max_iter: number,
};


export type MessageFromMasterToSlave = {
  cfg: Config,
  region: Region,
  
  wi: number, // worker index
  
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
};

export type MessageFromSlaveToMaster = {
  part: string,
  imgPart: Uint8ClampedArray["buffer"],
  
  wi: number, // worker index
  

  re: number,
  im: number,

  z: number,
};
