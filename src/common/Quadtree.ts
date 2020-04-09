export default class Quadtree {

  #parent: Quadtree | null;
  #children: Quadtree[];

  constructor(parent: Quadtree = null) {
    this.#parent = parent;
    this.#children = [];
  }
}