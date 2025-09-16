class Queue {
    constructor() { this._items = []; }
    enqueue(item) { this._items.push(item); }
    dequeue()     { return this._items.shift(); }
    clear()       { this._items = []; }
    get size()    { return this._items.length; }
}

// based on: https://stackoverflow.com/a/63208885
export default class WorkerPool {
    constructor(maxWorkers = 4) {
        this._queue = new Queue();
        this.maxWorkers = maxWorkers;
        this._currentWorkers = 0;
    }

    // an action should be a function without arguments that returns a promise
    enqueue(action) {
        // promise to work on this action
        return new Promise((resolve, reject) => {
            // put the action that is to be worked on in the queue, along with the functions needed to
            // resolve and reject this promise
            this._queue.enqueue({ action, resolve, reject });
            // try to work
            this._work();
        });
    }

    clearQueue() {
        // will not interrupt currently occupied workers
        this._queue.clear();
    }

    async _work() {
        // don't work if the worker limit is already reached
        if (this._currentWorkers >= this.maxWorkers) return;

        // try to get a new task from the queue
        let currentTask = this._queue.dequeue();
        // stop if the queue is empty
        if (!currentTask) return;

        try {
            // working on this task takes up a worker
            this._currentWorkers++;

            // invoke the action and then wait for the returned promise
            let result = await currentTask.action();

            // if the task was successfully completed, resolve the promise
            currentTask.resolve(result);
        } catch (e) {
            // if an error was encountered during the action, reject the promise
            currentTask.reject(e);
        } finally {
            // always free the worker after completing the action and then try to work on the next task
            this._currentWorkers--;
            this._work();
        }
    }
}
