import UpdateItems from "../update-worker-modules/update-items";
import UpdateSoldData from "../update-worker-modules/update-sold-data";
import UpdateStockTotals from "../update-worker-modules/update-stock-totals";
import UpdateSuppliers from "../update-worker-modules/update-suppliers";
import UpdateMargins from "../update-worker-modules/update-margins";
import UpdateChannelData from "../update-worker-modules/update-channel-data";
import GetLinnworksChannelPrices from "../update-worker-modules/get-linnworks-channel-prices";
import {bulkUpdateItems} from "../mongo-interface";

const {parentPort} = require("worker_threads")

parentPort.on("message", async (req: sbt.WorkerReq) => {
    parentPort.postMessage({msg: `${req.type} Update Worker Started!`});
    switch (req.type) {
        case "stockTotal":
            return parentPort.postMessage(
                createChannelMessage(req, await runUpdateStockTotals(req))
            );
        case "updateAll":
            return parentPort.postMessage(
                createChannelMessage(req, await runUpdateAll(req))
            )
        default:
            return parentPort.postMessage({msg: "No Update Worker Type Found!", type:"error"});
    }
});

const createChannelMessage = (req: sbt.WorkerReq, data = {}) => {
    return {type: "data", id: req.id, msg: `${req.type} worker done`, data: data}
}

const runUpdateStockTotals = async (req: sbt.WorkerReq) => {
    const merge = await UpdateStockTotals(undefined, req.data.skus)
    if (req.data.save) await bulkUpdateItems(merge)
    return merge;
}
const runUpdateAll = async (req: sbt.WorkerReq) => {
    let start = new Date()

    let merge = await UpdateItems(req.data.skus)

    let soldDataMerge = await UpdateSoldData(merge, req.data.skus)

    let stockTotalMerge = await UpdateStockTotals(soldDataMerge, req.data.skus)

    let suppliersMerge = await UpdateSuppliers(stockTotalMerge, req.data.skus)

    let channelDataMerge = await UpdateChannelData(suppliersMerge, req.data.skus)

    let channelPricesMerge = await GetLinnworksChannelPrices(channelDataMerge, req.data.skus)

    let marginUpdateMerge = await UpdateMargins(channelPricesMerge, req.data.skus)

    let result = await bulkUpdateItems(marginUpdateMerge)

    let finish = new Date()
    console.log("Update all complete!")
    console.log("Start: " + start)
    console.log("Finish: " + finish)
    console.log("Total: " + (finish.getTime() - start.getTime()) / 1000)
    return result
}