"use strict"
import Auth from "./linnworks/auth";
import {postToWorker} from './worker/worker-factory';
import {deleteOne, find, findOne, setData} from "./mongo-interface";
import {getLinnQuery} from "./linnworks/api";

interface mostRecentUpdate {
    RecentUpdates: {
        DATE: any
    }
}

interface SQLQueryResult {
    SKU:string
    DATE:string
}

export const init = async ()=>{
    await beat()
    setInterval(() => beat(), 60000)
    return;
}
export async function beat(){

    console.log("Heartbeat:", new Date().toLocaleString('en-GB'))

    const status = (await findOne<mostRecentUpdate>('HeartBeat', {ID: 'DBSTATUS'}, {}))
    if(!status) return
    await Auth();
    await checkForItemUpdates(status)
    await checkForStockUpdates(status)

    return
}

const checkForItemUpdates = async (current: mostRecentUpdate) => {

    const linnQuery = await getLinnQuery<SQLQueryResult>(
        `SELECT ItemNumber AS SKU,
                ModifiedDate AS 'DATE'
         FROM StockItem
         WHERE bLogicalDelete = 0
           AND ModifiedDate > '${current.RecentUpdates.DATE}'
         ORDER BY ModifiedDate DESC`
    )

    const UpdateItems = linnQuery.Results;
    if (!UpdateItems || UpdateItems.length <= 0) return;

    await logDataAndUpdateDBStatus(UpdateItems, "Item")
    await dbCleanUp()
    await postToWorker(
        "update",
        {msg: "", reqId: "", type: "updateAll", data: { skus: skuList(UpdateItems) }, id: new Date().getTime().toString()}
    )
    return;
}

const checkForStockUpdates = async (current: mostRecentUpdate) => {
    const linnQuery = await getLinnQuery<SQLQueryResult>(
        `SELECT si.ItemNumber AS 'SKU', sl.LastUpdateDate AS 'DATE'
         FROM [StockItem] si
             INNER JOIN [StockLevel] sl on si.pkStockItemId = sl.fkStockItemId
         WHERE bLogicalDelete = 0
           AND sl.LastUpdateDate > '${current.RecentUpdates.DATE}'
         ORDER BY sl.LastUpdateDate DESC`)

    const UpdateStock = linnQuery.Results;
    if (!UpdateStock || UpdateStock.length <= 0) return;

    await logDataAndUpdateDBStatus(UpdateStock, "Stock")
    await dbCleanUp()
    await postToWorker(
        "update",
        {msg: "", reqId: "", type: "stockTotal", data: {skus: skuList(UpdateStock), save: true}, id: new Date().getTime().toString()}
    )
    return;
}

const logDataAndUpdateDBStatus = async (data:SQLQueryResult[], type:string) => {
    for (let v of data) console.dir(v, { color: true, depth: 2 })
    console.log(`HB: ${type} Update Needed`)
    await setData('HeartBeat', {ID: 'DBSTATUS'}, {RecentUpdates: data[0]})
}

const skuList = (data:SQLQueryResult[]) => {
    return data.reduce((str, item) => {
        return str === '' ? `'${item.SKU}'` : str + `,'${item.SKU}'`
    }, "")
}

// function to clean up local db, deleting any documents that arnt in the linnworks database
const dbCleanUp = async () => {
    console.log('DB clean run')
    const linnQuery = await getLinnQuery<{SKU:string}>(
        'SELECT ItemNumber AS SKU FROM StockItem WHERE (bLogicalDelete = 0 OR IsVariationGroup = 1)'
    )

    const data = linnQuery.Results as {SKU:string}[];
    const skuList = data.map( e => { return e.SKU })

    const result = await find<{ SKU: string }>("New-Items", {ID: {$ne: 'DBSTATUS'}}, {SKU: 1})
    if(!result) return

    for (let value of result) {
        if (skuList.indexOf(value.SKU) === -1) await deleteOne("Items", {SKU: value.SKU})
    }
}