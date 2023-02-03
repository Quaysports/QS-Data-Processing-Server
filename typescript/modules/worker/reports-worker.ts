import {createChannelMessage} from "./worker-factory";
import {find} from "../mongo-interface";
import {OnlineOrder} from "../orders/orders";

const {parentPort} = require("worker_threads")

parentPort.on("message", async (req: sbt.WorkerReq) => {
    parentPort.postMessage({msg: `${req.type} Update Worker Started!`});
    switch (req.type) {
        case "online-sales":
            return parentPort.postMessage(
                createChannelMessage(req, await onlineSalesReport(req))
            );
        default:
            return parentPort.postMessage({msg: "No Update Worker Type Found!", type:"error"});
    }
});

async function onlineSalesReport(req: sbt.WorkerReq){
    //get date 3am three days ago
    let date = new Date()
    date.setDate(date.getDate() - 3)
    date.setHours(3, 0, 0, 0)

    //get all orders from three days ago until now

    let orders = await find<OnlineOrder>("Orders", {date: {$gte: date.toISOString()}})
    if(!orders) return {report: 'no orders found'}

    console.dir(orders, {depth: 5})

    return {report: 'done'}
}