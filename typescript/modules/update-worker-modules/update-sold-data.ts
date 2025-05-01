import Auth from "../linnworks/auth";
import {findDistinct} from "../mongo-interface";
import {getLinnQuery} from "../linnworks/api";

export default async function UpdateSoldData(merge: Map<string, sbt.Item>, skus?: string) {
    await Auth(true)
    console.log("querying sold data!")
    console.log(new Date())

    let query = skus
        ? {
            SKU: {$in: skus.replace(/'/g, "").split(",")},
            isComposite: false
        }
        : {isComposite: false}

    const result = await findDistinct("New-Items", "SKU", query)

    if (!result) return merge

    let skuList = ''
    for (let sku of result) skuList === '' ? skuList = `'${sku}'` : skuList += `,'${sku}'`

    let cy = new Date().getFullYear()
    let yearString = `'${cy}','${cy - 1}','${cy - 2}','${cy - 3}','${cy - 4}'`

    function queryString(years: string) {
        return `SELECT 'linnId' = si.pkStockItemId,
                       'Month' = MONTH (o.dProcessedOn),
                        'Year' = YEAR(o.dProcessedOn),
                        'Qty' = SUM(oi.nqty)
                FROM
                    [Order] o
                    INNER JOIN OrderItem oi on o.pkOrderID = oi.fkOrderID
                    INNER JOIN StockItem si on si.pkStockItemId = oi.fkStockItemID_processed
                WHERE
                    YEAR (o.dProcessedOn) IN (${years})
                  AND si.bLogicalDelete = 0
                  AND si.bContainsComposites = 0 ${skus ? "AND si.ItemNumber IN (" + skus + ")" : ""}
                GROUP BY
                    si.pkStockItemId, MONTH (o.dProcessedOn), YEAR (o.dProcessedOn)`
    }

    interface SQLQuery {
        linnId: string,
        Month: string,
        Year: string,
        Qty: string
    }

    const response = await getLinnQuery<SQLQuery>(queryString(yearString));
    const linnData = response.Results || []

    if (linnData.length > 0) {
        for (let item of linnData) {
            let mergeItem = merge.get(item.linnId)
            if (!mergeItem) continue

            mergeItem.stockHistory ??= []

            let pos = mergeItem.stockHistory.findIndex(i => i[0] === Number(item.Year))
            if (pos === -1) {
                let newYearArray = Array.from({length: 12}, () => (0))
                newYearArray[0] = Number(item.Year)
                newYearArray[Number(item.Month)] = Number(item.Qty)
                mergeItem.stockHistory.push(newYearArray)
            } else {
                mergeItem.stockHistory[pos][Number(item.Month)] = Number(item.Qty)
            }
        }
    }



    return merge as Map<string, sbt.Item>
}