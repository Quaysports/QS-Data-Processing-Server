import Thread from "worker_threads"
import EventEmitter from 'events'
import path from "path"

let events = new Map<string, EventEmitter>()

export function postToWorker(worker: string, data: sbt.WorkerData): Promise<any> {

    return new Promise((resolve, reject) => {
        try {
            let emitter = new EventEmitter()
            emitter.once('data', async (result) => {
                console.log("Worker data received")
                if (events.has(data.id)) events.delete(data.id)
                await newWorker.terminate()
                resolve(result)
            })
            emitter.once('error', async (err) => {
                console.log("Worker error: ", err)
                console.error("Error stack trace:", err.stack); // Log stack trace if available
                console.error("Error details:", err.message); // Log error message
                if (events.has(data.id)) {
                    events.delete(data.id);
                }
                try {
                    await newWorker.terminate();
                    reject(err);
                } catch (terminationError) {
                    console.error("Error while terminating worker:", terminationError);
                    reject(terminationError);
                }
            })
            emitter.once('close', async () => {
                console.log("Worker close event!")
                if (events.has(data.id)) events.delete(data.id)
                await newWorker.terminate()
                reject(new Error("Worker closed unexpectedly"));
            })
            events.set(data.id, emitter)

            let newWorker: Thread.Worker = spawnWorker(worker, data.id);
            newWorker.postMessage(data)

        } catch (err) {
            reject(err)
        }
    })
}

function spawnWorker(type: string, eventId: string) {

    console.log("Spawning worker")
    let workerPath;

    switch (type) {
        case "reports":
            workerPath = path.resolve(__dirname, 'reports-worker.js');
            break
        case "update":
            workerPath = path.resolve(__dirname, 'update-worker.js');
            break
        default:
            workerPath = undefined;
            break
    }

    if (!workerPath) throw new Error("Worker type not found")

    let thread = new Thread.Worker(workerPath);

    thread.on("error", (err: Error) => events.get(eventId)?.emit(
        'error',
        {"Worker error": err.message}
    ));

    thread.on("exit", (exitCode) => console.log(`Worker stopped with exit code ${exitCode}`))

    thread.on("message", (result: sbt.WorkerData) => {
        switch (result.type) {
            case "data":
                events.get(eventId)?.emit('data', result);
                break;
            case "close":
                events.get(eventId)?.emit('close');
                break;
            case "error":
                events.get(eventId)?.emit('error', result);
                break;
        }
    });

    return thread
}

export const createChannelMessage = (req: sbt.WorkerReq, data = {}) => {
    return {type: "data", id: req.id, msg: `${req.type} worker done`, data: data}
}