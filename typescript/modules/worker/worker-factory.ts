import Thread from "worker_threads"
import EventEmitter from 'events'

let events = new Map<string, EventEmitter>()

export function postToWorker(worker: string, data: sbt.WorkerData):Promise<any> {

    return new Promise((resolve,reject) => {

        let emitter = new EventEmitter()
        emitter.once('data', async(result) => {
            console.log("Worker data received")
            if(events.has(data.id)) events.delete(data.id)
            await updateWorker.terminate()
            resolve(result)
        })
        emitter.once('error', async (err) => {
            console.log("Worker error: ", err)
            if (events.has(data.id)) events.delete(data.id)
            await updateWorker.terminate()
            reject(err)
        })
        emitter.once('close', async () => {
            console.log("Worker close event!")
            if (events.has(data.id)) events.delete(data.id)
            await updateWorker.terminate()
        })
        events.set(data.id, emitter)

        let updateWorker: Thread.Worker = spawnUpdateWorker(data.id)
        updateWorker.postMessage(data)
    })
}

function spawnUpdateWorker(eventId: string) {

    console.log("Spawning worker")
    let thread = new Thread.Worker(`./modules/worker/item-worker.js`);

    thread.on("error", (err: Error) => events.get(eventId)?.emit(
        'error',
        {"Worker error": err.message}
    ));

    thread.on("exit", (exitCode) => console.log(`Worker stopped with exit code ${exitCode}`))

    thread.on("message", (result: sbt.WorkerData) => {
        switch(result.type) {
            case "data": events.get(eventId)?.emit('data', result); break;
            case "close": events.get(eventId)?.emit('close'); break;
            case "error": events.get(eventId)?.emit('error', result); break;
        }
    });

    return thread
}