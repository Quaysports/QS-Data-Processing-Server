import Auth from "../linnworks/auth";
import {getLinnQuery} from "../linnworks/api";
import {getItemsFromDB} from "./update-items";

export default async function updateChannelReferences(
    merge:undefined | Map<string,sbt.Item> = undefined, skus?:string
) {
    await Auth(true)
    console.log("querying CR data!")
    console.log(new Date())

    if(!merge) { merge = await getItemsFromDB(skus) }

    interface SQLQuery {
        linnId: string,
        source: "AMAZON" | "EBAY" | "MAGENTO",
        subSource: string,
        channelReferenceId:string,
        channelSKU:string
    }

    let query = `SELECT si.pkStockItemId as linnId,
                    sc.source,
                    sc.subsource,
                    sc.channelReferenceId,
                    sc.channelSKU
                 FROM StockItem si
                    LEFT JOIN Stock_ChannelSKU sc on si.pkStockItemId = sc.fkStockItemId
                 WHERE si.bLogicalDelete = 0
                    AND sc.subsource NOT IN ('https://quaysports.com', 'https://zentackle.com')
                    ${skus ? "AND si.ItemNumber IN (" + skus + ")" : ""}`

    const result = (await getLinnQuery<SQLQuery>(query)).Results

    for (let item of result) {
        const {linnId, source, channelReferenceId, channelSKU} = item

        let mergeItem = merge.get(linnId)
        if (!mergeItem) continue

        if(mergeItem.channelReferenceData.findIndex((crd) => crd.id === channelReferenceId) === -1){
            mergeItem.channelReferenceData.push({
                id: channelReferenceId,
                source: source.toLowerCase(),
                SKU: channelSKU
            })
        }
    }
    return merge
}