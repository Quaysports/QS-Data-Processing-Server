import Auth from "../linnworks/auth";
import {getLinnQuery} from "../linnworks/api";

export interface SQLQuery {linnId:string, YEAR:number, SOURCE:string, QTY:string}
export default async function UpdateChannelData(
    merge = (new Map<string, sbt.Item>()), skus?:string
) {
    await Auth(true)

    console.log("querying CD data!")
    console.log(new Date())

    let year = new Date().getFullYear()

    function queryString(year:number, skus?:string) {
        return `DECLARE @Results
                      TABLE
                      (
                          linnId    NVARCHAR(128),
                          YEAR   int,
                          SOURCE NVARCHAR(50),
                          QTY    int
                      )
        DECLARE @year int
        SET @year = '${year}'
        DECLARE @2year int
        SET @2year = @year - 2
        WHILE @2year <= @year
            BEGIN
                INSERT INTO @Results (linnId, YEAR, SOURCE, QTY)
                SELECT si.pkStockItemID AS linnId,
                       @year         AS YEAR,
                       o.Source      AS SOURCE,
                       SUM(nQty)     AS QTY
                FROM [Order] o
                         INNER JOIN OrderItem oi on o.pkOrderID = oi.fkOrderID
                         INNER JOIN StockItem si on oi.fkStockItemId_processed = si.pkStockItemID
                WHERE Convert(DATETIME, o.dProcessedOn) >=
                      Convert(DATETIME, CAST(@year AS NVARCHAR(10)) + '-01-01')
                  AND Convert(DATETIME, FLOOR(CONVERT(FLOAT, o.dProcessedOn))) <=
                      Convert(DATETIME, CAST(@year AS NVARCHAR(10)) + '-12-31')
                  AND oi.fPricePerUnit > 0
                  AND si.bLogicalDelete = 0
                    ${skus ? "AND si.ItemNumber IN (" + skus + ")" : ""}
                GROUP BY si.pkStockItemID, o.Source
                ORDER BY si.pkStockItemID
                SET @year = @year - 1
            END
        SELECT *
        FROM @Results`
    }

    const result = (await getLinnQuery<SQLQuery>(queryString(year, skus))).Results

    for (let item of result) {
        let mergeItem = merge.get(item.linnId)
        if(!mergeItem) continue

        mergeItem.channelData ??= []
        let pos = mergeItem.channelData.findIndex(x => x.year === Number(item.YEAR) && x.source === item.SOURCE)
        pos === -1
            ? mergeItem.channelData.push({year: Number(item.YEAR), source: item.SOURCE, quantity: Number(item.QTY)})
            : mergeItem.channelData[pos].quantity = Number(item.QTY)
    }

    return (merge);
}