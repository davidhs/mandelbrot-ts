export default class ImagePart {
  public width: number;
  public height: number;
  public channels: number;
  public arr: Uint8ClampedArray;

  constructor(
    width: number,
    height: number,
    channels: number,
    arr?: Uint8ClampedArray
  ) {
    this.arr =
      typeof arr !== "undefined"
        ? arr
        : new Uint8ClampedArray(channels * width * height);
    this.width = width;
    this.height = height;
    this.channels = channels;
  }

  public getSize() {
    return this.width * this.height * this.channels;
  }

  public getBuffer() {
    return this.arr.buffer;
  }

  public getAdditionalData() {
    return {
      width: this.width,
      height: this.height,
      channels: this.channels
    };
  }
}
