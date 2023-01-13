import Auth from "../linnworks/auth";
import {getLinnQuery} from "../linnworks/api";
import {find} from "../mongo-interface";

export default async function UpdateStockTotals(merge?: Map<string, sbt.Item>, skus?: string){
    await Auth(true)

    console.log("querying stocktotal data!")
    console.log(new Date())

    let query = `SELECT si.ItemNumber        AS SKU,
                        sl.Quantity          AS quantity,
                        CASE
                            WHEN sl.fkStockLocationId = '00000000-0000-0000-0000-000000000000' then 'default'
                            WHEN sl.fkStockLocationId = '1a692c39-afc9-4844-9f11-6e6625a9c1f1' then 'warehouse'
                            ELSE ''
                            END              AS location,
                        SUM(sl.MinimumLevel) AS minimum
                 FROM [StockItem] si
                     INNER JOIN [StockLevel] sl on si.pkStockItemId = sl.fkStockItemId
                 WHERE sl.fkStockLocationId in ('00000000-0000-0000-0000-000000000000', '1a692c39-afc9-4844-9f11-6e6625a9c1f1')
                   AND si.bLogicalDelete = 0 ${skus ? "AND si.ItemNumber IN (" + skus + ")" : ""}
                 GROUP BY si.ItemNumber, sl.Quantity, si.PurchasePrice, sl.fkStockLocationId`

    interface SQLQuery  { SKU: string,quantity: string, location: string, minimum: string }

    const linnData = (await getLinnQuery<SQLQuery>(query)).Results

    if(merge === undefined) {
        let skusArr = skus?.replaceAll("'","").split(",")
        let mergeData = await find<sbt.Item>("New-Items", {SKU:{$in:skusArr}})
        mergeData? merge = new Map(mergeData.map(item => [item.SKU, item])) : merge = new Map()
    }

    for (let item of linnData) {
        let quantity = Number(item.quantity)

        if (!merge.has(item.SKU)) { continue }

        let mergeItem = merge.get(item.SKU)!
        let purchasePrice = mergeItem.prices.purchase

        if (item.location === 'default') {
            mergeItem.stock.default = quantity
            mergeItem.stock.minimum = parseFloat(item.minimum)
            mergeItem.stock.total += quantity
            if (purchasePrice > 0 && quantity > 0) {
                mergeItem.stock.value += quantity * purchasePrice
            }
        }
        if (item.location === 'warehouse') {
            mergeItem.stock.warehouse = quantity
            mergeItem.stock.total += quantity
            if (purchasePrice > 0 && quantity > 0) {
                mergeItem.stock.value += quantity * purchasePrice
            }
        }
    }
    return merge as Map<string, sbt.Item>
}