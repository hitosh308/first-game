export class ObjectPool {
  constructor(createFn) {
    this.createFn = createFn;
    this.pool = [];
  }

  acquire() {
    return this.pool.pop() || this.createFn();
  }

  release(item) {
    this.pool.push(item);
  }
}
