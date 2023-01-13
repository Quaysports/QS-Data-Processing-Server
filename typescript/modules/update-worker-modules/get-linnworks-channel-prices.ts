import Auth from "../linnworks/auth";
import {getLinnQuery} from "../linnworks/api";

export default async function GetLinnworksChannelPrices(
    merge = (new Map<string, sbt.Item>()), skus?:string
) {
    await Auth(true)
    console.log("querying CP data!")
    console.log(new Date())

    interface SQLQuery {
        ItemNumber: string,
        Source:"amazon" | "ebay" | "magento",
        SubSource:string,
        Price:string,
        UpdateStatus:string,
        pkRowId:string
    }

    let query = `SELECT si.ItemNumber,
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
        const {ItemNumber, Source, SubSource, Price, UpdateStatus, pkRowId} = item
        let mergeItem = merge.get(ItemNumber)
        if (!mergeItem) continue

        mergeItem!.channelPrices ??= {
            amazon: {
                id: "",
                price: "",
                status: 0,
                subSource: "",
                updateRequired: false,
                updated: ""
            },
            ebay: {id: "", price: "", status: 0, subSource: "", updateRequired: false, updated: ""},
            magento: {id: "", price: "", status: 0, subSource: "", updateRequired: false, updated: ""},
            shop: {price: "", status: 0}
        }

        let channelPriceData:sbt.ChannelPriceData = {
            id: pkRowId ? pkRowId : "",
            status: UpdateStatus ? Number(UpdateStatus) : 0,
            updateRequired: false,
            price: Price,
            subSource: SubSource,
            updated: (new Date()).toString()
        }

        switch(Source){
            case "amazon": if(mergeItem.prices.amazon !== parseFloat(Price)) channelPriceData.updateRequired = true; break;
            case "ebay": if(mergeItem.prices.ebay !== parseFloat(Price)) channelPriceData.updateRequired = true; break;
            case "magento": if(mergeItem.prices.magento !== parseFloat(Price)) channelPriceData.updateRequired = true; break;
        }

        mergeItem!.channelPrices![item.Source] = channelPriceData
    }
    return merge
}