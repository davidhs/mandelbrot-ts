import { shuffle, assert } from "./utils.js";

export default class Qtree {
  #path: string;
  #children: Qtree[];
  #claimed: boolean;
  #splits: number;
  #childrenClaimed: number;
  #parent: Qtree | null;

  constructor(parent: Qtree | null = null, path = "") {
    this.#parent = parent;
    this.#children = [];
    this.#path = path;
    this.#claimed = false;
    this.#splits = 0;
    this.#childrenClaimed = 0;
  }

  public getAvailableLeaf(): Qtree | null {
    if (this.#claimed) {
      return null;
    } else {
      if (this.isLeaf()) {
        this.#claimed = true;

        if (this.#parent !== null) {
          this.#parent.incrementCount();
        }

        return this;
      } else {
        const n = this.#children.length;

        const index_list = [...Array(n).keys()];
        shuffle(index_list);

        for (let i = 0; i < n; i += 1) {
          const index = index_list[i];

          const child = this.#children[index];

          if (child.#claimed) continue;

          const leaf = child.getAvailableLeaf();

          assert(leaf !== null);

          return leaf;
        }

        return null;
      }
    }
  }

  private incrementCount() {
    this.#childrenClaimed += 1;

    assert(this.#childrenClaimed >= 0 && this.#childrenClaimed <= this.#children.length);

    if (this.#childrenClaimed === this.#children.length) {
      this.#claimed = true;

      if (this.#parent !== null) {
        this.#parent.incrementCount();
      }
    }
  }

  public free(): void {
    const n = this.#children.length;

    this.#claimed = false;
    this.#childrenClaimed = 0;

    for (let i = 0; i < n; i += 1) {
      const child = this.#children[i];

      child.free();
    }
  }

  public getPath(): string {
    return this.#path;
  }

  public getDepth(): number {
    return this.#splits;
  }

  /**
   * TODO: maybe implement an iterator for the children?
   */
  public getChildren(): Qtree[] {
    return this.#children;
  }


  public isLeaf() {
    return this.#children.length === 0;
  }

  /**
   * Preorder: do self then children.
   * 
   * @param fn 
   */
  public forAllPreorder(fn: (self: Qtree) => void): void {
    fn(this);

    if (!this.isLeaf()) {
      for (let i = 0; i < this.#children.length; i += 1) {
        this.#children[i].forAllPreorder(fn);
      }
    }
  }

  /**
   * Postorder: do children then self.
   * 
   * @param fn 
   */
  public forPostPreorder(fn: (self: Qtree) => void): void {
    if (!this.isLeaf()) {
      for (let i = 0; i < this.#children.length; i += 1) {
        this.#children[i].forPostPreorder(fn);
      }
    }

    fn(this);
  }

  private splitSelf(): void {
    if (this.#children.length === 0) {
      this.#splits += 1;
      for (let i = 0; i < 4; i += 1) {
        this.#children.push(new Qtree(this, this.#path + (i + 1)));
      }
    }
  }

  private _splitSubTree(): void {
    if (this.#children.length === 0) {
      this.splitSelf();
    } else {
      for (let i = 0; i < 4; i += 1) {
        this.#children[i]._splitSubTree();
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
