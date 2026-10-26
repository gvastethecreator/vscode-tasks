export class RefreshCoordinator<T> {
  private generation = 0;
  private handledGeneration = 0;
  private running = false;
  private disposed = false;
  private readonly load: () => Promise<T>;
  private readonly apply: (value: T) => void | Promise<void>;
  private readonly fail: (error: unknown) => void | Promise<void>;

  constructor(
    load: () => Promise<T>,
    apply: (value: T) => void | Promise<void>,
    fail: (error: unknown) => void | Promise<void>,
  ) {
    this.load = load;
    this.apply = apply;
    this.fail = fail;
  }

  request(): void {
    if (this.disposed) {
      return;
    }
    this.generation += 1;
    if (!this.running) {
      void this.run();
    }
  }

  dispose(): void {
    this.disposed = true;
    this.generation += 1;
  }

  private async run(): Promise<void> {
    this.running = true;
    try {
      while (!this.disposed) {
        const current = this.generation;
        try {
          const value = await this.load();
          if (!this.disposed && current === this.generation) {
            await this.apply(value);
          }
        } catch (error) {
          if (!this.disposed && current === this.generation) {
            await this.fail(error);
          }
        }
        this.handledGeneration = current;
        if (current === this.generation) {
          break;
        }
      }
    } finally {
      this.running = false;
      if (!this.disposed && this.handledGeneration < this.generation) {
        void this.run();
      }
    }
  }
}
