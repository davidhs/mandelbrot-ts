class Qtree {
  public path: string;
  public children: Array<Qtree>;
  public parent: Qtree | null;
  public data: Object;
  public flag: boolean;
  public splits: number;

  constructor(path?: string, parent?: Qtree) {
    this.parent = typeof parent !== "undefined" ? parent : null;
    this.children = [];
    this.data = {};
    this.path = typeof path !== "undefined" ? path : "";
    this.flag = false;
    this.splits = 0;
  }

  public getPath(): string {
    return this.path;
  }

  public getDepth(): number {
    return this.splits;
  }

  public setData(data: Object): void {
    this.data = data;
  }

  public getFlag(): boolean {
    return this.flag;
  }

  public setFlag(flag: boolean): void {
    this.flag = flag;

    if (this.parent) {
      this.parent.checkFlagStatus();
    }
  }

  public checkFlagStatus(): void {
    let sum = 0;
    if (this.children.length === 4) {
      for (let i = 0; i < this.children.length; i += 1) {
        let child = this.children[i];
        if (child.getFlag() === true) {
          sum += 1;
        }
      }

      if (sum === 4) {
        this.setFlag(true);
        if (this.parent) {
          this.parent.checkFlagStatus();
        }
      }
    }
  }

  public isLeaf(): boolean {
    return this.children.length === 0;
  }

  public forAll(func: (self: Qtree) => void): void {
    func(this);

    if (!this.isLeaf()) {
      for (let i = 0; i < this.children.length; i += 1) {
        this.children[i].forAll(func);
      }
    }
  }

  public splitSelf(): void {
    if (this.children.length === 0) {
      this.splits += 1;
      for (let i = 0; i < 4; i += 1) {
        this.children.push(new Qtree(this.path + (i + 1), this));
      }
    }
  }

  private _splitSubTree(): void {
    if (this.children.length === 0) {
      this.splitSelf();
    } else {
      for (let i = 0; i < 4; i += 1) {
        this.children[i]._splitSubTree();
      }
    }
  }

  public splitSubTree(times?: number): void {
    times = typeof times !== "undefined" ? times : 1;

    for (let i = 0; i < times; i += 1) {
      this._splitSubTree();
    }
  }
}
