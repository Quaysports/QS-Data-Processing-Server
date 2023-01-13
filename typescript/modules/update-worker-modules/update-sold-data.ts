import Auth from "../linnworks/auth";
import {findDistinct} from "../mongo-interface";
import {getLinnQuery} from "../linnworks/api";

export default async function UpdateSoldData(merge: Map<string, sbt.Item>, skus?: string) {
    await Auth(true)
    console.log("querying sold data!")
    console.log(new Date())
    console.log(merge)

    let query = skus
        ? {
            SKU: {$in: skus.replace(/'/g, "").split(",")},
            isComposite: false
        }
        : {isComposite: false}

    const result = await findDistinct("New-Items", "SKU", query)

    if (!result) return

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
        Month: number,
        Year: number,
        Qty: string
    }

    const linnData = (await getLinnQuery<SQLQuery>(queryString(yearString))).Results

    if (linnData.length > 0) {
        let indexTrack: { [key: string]: { [key: number]: number } } = {}
        for (let item of linnData) {
            let mergeItem = merge.get(item.linnId)!
            mergeItem.stockHistory ??= []

            trackIndex(item, mergeItem.stockHistory, indexTrack)

            mergeItem.stockHistory[indexTrack[item.linnId][item.Year]] ??= Array.from({length: 12}, () => (0))
            mergeItem.stockHistory[indexTrack[item.linnId][item.Year]][0] = item.Year
            mergeItem.stockHistory[indexTrack[item.linnId][item.Year]][item.Month] = Number(item["Qty"])
        }
    }

    function trackIndex(item: SQLQuery, history: sbt.Item["stockHistory"], indexTrack: { [key: string]: { [key: number]: number } }) {

        if (indexTrack[item.linnId]?.[item.Year]) return
        indexTrack[item.linnId] ??= {[item.Year]: 0}

        if (history.length === 0) return

        indexTrack[item.linnId] = {[item.Year]: history.length}
        history.forEach((year, index) => {
            if (year[0] === item.Year) indexTrack[item.linnId] = {[item.Year]: index}
        })

    }

    return merge as Map<string, sbt.Item>
}