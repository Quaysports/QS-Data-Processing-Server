import Auth from "../linnworks/auth";
import {getLinnQuery} from "../linnworks/api";
import {getItemsFromDB} from "./update-items";

export interface SQLQuery {
    ItemNumber: string,
    linnId: string,
    Source:"amazon" | "ebay" | "magento",
    SubSource:string,
    Price:string,
    UpdateStatus:string,
    pkRowId:string
}

export default async function GetLinnworksChannelPrices(
    merge:undefined | Map<string,sbt.Item> = undefined, skus?:string
) {
    await Auth(true)
    console.log("querying CP data!")
    console.log(new Date())

    if(!merge) { merge = await getItemsFromDB(skus) }

    let query = `SELECT si.pkStockItemId as linnId,
                        sp.Source,
                        sp.SubSource,
                        sp.SalePrice as Price,
                        sp.UpdateStatus,
                        sp.pkRowId
                 FROM StockItem si
                          INNER JOIN StockItem_Pricing sp on si.pkStockItemId = sp.fkStockItemId
                 WHERE si.bLogicalDelete = 0
                   AND sp.SubSource <> 'https://quaysports.com'
                     ${skus ? "AND si.ItemNumber IN (" + skus + ")" : ""}`

    const result = (await getLinnQuery<SQLQuery>(query)).Results

    for (let item of result) {
        const {linnId, Source, SubSource, Price, UpdateStatus, pkRowId} = item
        const channelPricesKey = Source.toLowerCase() as keyof sbt.Item["channelPrices"]
        const newPrice = Math.round(parseFloat(Price) * 100)

        let mergeItem = merge.get(linnId)

        if (!mergeItem) continue

        mergeItem!.channelPrices ??= {
            amazon: {
                id: "",
                price: 0,
                status: 0,
                subSource: "",
                updateRequired: false,
                updated: ""
            },
            ebay: {id: "", price: 0, status: 0, subSource: "", updateRequired: false, updated: ""},
            magento: {id: "", price: 0, status: 0, subSource: "", updateRequired: false, updated: ""},
            shop: {price: 0, status: 0}
        }

        let channelPriceData:sbt.ChannelPriceData = {
            id: pkRowId ? pkRowId : "",
            status: UpdateStatus ? Number(UpdateStatus) : 0,
            updateRequired: false,
            price: newPrice,
            subSource: SubSource,
            updated: (new Date()).toString()
        }

        switch(Source.toLowerCase()){
            case "amazon": if(mergeItem.prices.amazon !== newPrice) channelPriceData.updateRequired = true; break;
            case "ebay": if(mergeItem.prices.ebay !== newPrice) channelPriceData.updateRequired = true; break;
            case "magento": if(mergeItem.prices.magento !== newPrice) channelPriceData.updateRequired = true; break;
        }

        mergeItem.channelPrices[channelPricesKey] = channelPriceData
    }
    return merge
}