import Auth from "../linnworks/auth";
import {getLinnQuery} from "../linnworks/api";
import {find} from "../mongo-interface";
import {sortData} from "../utils";

export default async function UpdateStockTotals(merge?: Map<string, sbt.Item>, skus?: string) {
    await Auth(true)

    console.log("querying stocktotal data!")
    console.log(new Date())

    let query = `SELECT si.pkStockItemId AS linnId,
                        sl.Quantity AS quantity,
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
                 GROUP BY si.pkStockItemId, sl.Quantity, si.PurchasePrice, sl.fkStockLocationId`

    interface SQLQuery {
        linnId: string,
        quantity: string,
        location: string,
        minimum: string
    }

    const linnData = (await getLinnQuery<SQLQuery>(query)).Results

    if (merge === undefined) {
        console.log("merge undefined!")
        let skusArr = skus?.replaceAll("'", "").split(",")
        let mergeData = await find<sbt.Item>("New-Items", {SKU: {$in: skusArr}})
        mergeData ? merge = new Map(mergeData.map(item => [item.linnId, item])) : merge = new Map()
    }

    const shipments = await find<sbt.Shipment>("Shipping", {delivered: false})
    addOnOrderToItems(shipments, merge)

    for (let item of linnData) {
        let quantity = Number(item.quantity)

        if (!merge.has(item.linnId)) {
            continue
        }

        let mergeItem = merge.get(item.linnId)!

        let purchasePrice = mergeItem.prices.purchase

        if (item.location === 'default') {
            mergeItem.stock.default = quantity
            mergeItem.stock.minimum = parseFloat(item.minimum)
            mergeItem.stock.total = mergeItem.stock.default + mergeItem.stock.warehouse
            if (purchasePrice > 0 && quantity > 0) {
                mergeItem.stock.value = mergeItem.stock.total * purchasePrice
            }
        }
        if (item.location === 'warehouse') {
            mergeItem.stock.warehouse = quantity
            mergeItem.stock.total = mergeItem.stock.default + mergeItem.stock.warehouse
            if (purchasePrice > 0 && mergeItem.stock.total > 0) {
                mergeItem.stock.value = mergeItem.stock.total * purchasePrice
            }
        }
    }


    for (const [_, item] of merge) {
        if (!item.stockConsumption) {
            item.stockConsumption = {
                fourMonthOutOfStock: 0,
                historicOutOfStock: 0,
                oneMonthOutOfStock: 0,
                historicConsumption: []
            }
        }
        item.stockConsumption.historicConsumption = Array(12).fill(0)

        for (let i in item.stockConsumption.historicConsumption) {
            item.stockConsumption.historicConsumption[i] = await historicAvg(Number(i), item.stockHistory)
        }


        if (item.onOrder.length < 0) continue

        //recalculate out of stock based on incoming shipments
        let combinedStockLevel = item.stock.total
        if(item.onOrder.length === 0) {
            item.stockConsumption.historicOutOfStock = calculateHistoricOOS(item.stock.total, item.stockConsumption.historicConsumption)
            const oneMonthConsumption = calculateOneMonthConsumption(item.stockHistory)
            item.stockConsumption.oneMonthOutOfStock = calculateOOS(item.stock.total, oneMonthConsumption)
            const fourMonthConsumption = calculateFourMonthConsumption(item.stockHistory)
            item.stockConsumption.fourMonthOutOfStock = calculateOOS(item.stock.total, fourMonthConsumption)
        } else {
            for (let order of item.onOrder) {
                if (order.due > item.stockConsumption.historicOutOfStock) continue
                combinedStockLevel += order.quantity
                item.stockConsumption.historicOutOfStock = calculateHistoricOOS(combinedStockLevel, item.stockConsumption.historicConsumption)
                const oneMonthConsumption = calculateOneMonthConsumption(item.stockHistory)
                item.stockConsumption.oneMonthOutOfStock = calculateOOS(combinedStockLevel, oneMonthConsumption)
                const fourMonthConsumption = calculateFourMonthConsumption(item.stockHistory)
                item.stockConsumption.fourMonthOutOfStock = calculateOOS(combinedStockLevel, fourMonthConsumption)
            }
        }
    }
    return merge as Map<string, sbt.Item>
}

function calculateHistoricOOS(stockLevel: number, historicConsumption: number[]) {
    const end = new Date().getMonth() + 24
    let currentDate = new Date()
    let i = new Date().getMonth()
    let outOfStockDate = 0
    do {
        if (i % 12 === 0) currentDate.setFullYear(currentDate.getFullYear() + 1)

        if (stockLevel - historicConsumption[i % 12] < 0) {
            currentDate.setMonth(i % 12)
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
            const zeroPoint = (100 / historicConsumption[i % 12]) * stockLevel
            const lastDay = endOfMonth * (zeroPoint / 100)
            currentDate.setDate(Math.round(lastDay))
            outOfStockDate = currentDate.getTime()
            break;
        } else {
            stockLevel -= historicConsumption[i % 12]
        }
        i++
    } while (i < end)
    return outOfStockDate
}

function calculateFourMonthConsumption(stockHistory: sbt.Item["stockHistory"]) {
    let currentDate = new Date()
    currentDate.setMonth(currentDate.getMonth() - 1)
    let fourMonthsAgo = new Date()
    fourMonthsAgo.setMonth(currentDate.getMonth() - 4)
    let consumption = 0

    if (currentDate.getFullYear() === fourMonthsAgo.getFullYear()) {
        let hist = stockHistory.find(hist => hist[0] === currentDate.getFullYear())
        if (!hist) return consumption
        for (let i = fourMonthsAgo.getMonth() + 1; i < currentDate.getMonth() + 1; i++) {
            console.log(i)
            consumption += hist[i]
        }
    } else {
        let currentYearHist = stockHistory.find(hist => hist[0] === currentDate.getFullYear())
        let lastYearHist = stockHistory.find(hist => hist[0] === fourMonthsAgo.getFullYear())
        if (!currentYearHist || !lastYearHist) return consumption
        for (let i = fourMonthsAgo.getMonth() + 1; i <= 12; i++) {
            consumption += lastYearHist[i]
        }
        for (let i = 1; i < currentDate.getMonth() + 1; i++) {
            consumption += currentYearHist[i]
        }
    }
    return consumption / 4
}

function calculateOneMonthConsumption(stockHistory: sbt.Item["stockHistory"]) {
    let currentDate = new Date()
    let oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    let consumption = 0

    if (currentDate.getFullYear() === oneMonthAgo.getFullYear()) {
        let hist = stockHistory.find(hist => hist[0] === currentDate.getFullYear())
        if (!hist) return consumption
        consumption += hist[oneMonthAgo.getMonth() + 1]
    } else {
        let lastYearHist = stockHistory.find(hist => hist[0] === oneMonthAgo.getFullYear())
        if (!lastYearHist) return consumption
        consumption += lastYearHist[oneMonthAgo.getMonth() + 1]
    }
    return consumption
}

function calculateOOS(stockLevel: number, consumption: number) {
    const end = new Date().getMonth() + 24
    let currentDate = new Date()
    let i = new Date().getMonth()
    let outOfStockDate = 0

    do {
        if (i % 12 === 0) currentDate.setFullYear(currentDate.getFullYear() + 1)
        if (stockLevel - consumption < 0) {
            currentDate.setMonth(i % 12)
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
            const zeroPoint = (100 / consumption) * stockLevel
            const lastDay = endOfMonth * (zeroPoint / 100)
            currentDate.setDate(Math.round(lastDay))
            outOfStockDate = currentDate.getTime()
            break;
        } else {
            stockLevel -= consumption
        }
        i++
    } while (i < end)
    return outOfStockDate
}

async function historicAvg(month: number, hist: sbt.Item["stockHistory"]) {
    let cd = new Date();

    let years = 0
    let sales = 0

    for (let year of hist) {
        if (Number(year[0]) === cd.getFullYear()) continue;
        years++
        sales += year[month + 1]
    }

    return sales === 0 || years === 0 ? 0 : Math.round((sales / years) * 1.1)
}

function addOnOrderToItems(shipments: sbt.Shipment[] = [], items: Map<string, sbt.Item> = new Map<string, sbt.Item>()) {

    //clones items map and changes key to SKU for faster lookup, also resets onOrder array
    const skuMap = new Map<string, sbt.Item>()
    items.forEach(item => {
        item.onOrder = []
        skuMap.set(item.SKU, item)
    })

    for (const shipment of shipments) {
        for (let val of shipment.data) {
            //gets linnId from skuMap so that the correct item in items map is updated
            let linnId = skuMap.get(val.sku)?.linnId
            if(!linnId) continue;
            let item = items.get(linnId)!
            let existing = item.onOrder?.find(o => o.id === String(shipment.id))
            if (existing) {
                if (existing.quantity < parseFloat(val.qty)) existing.quantity = parseFloat(val.qty)
            } else {
                item.onOrder.push({
                    confirmed: shipment.confirmed,
                    due: new Date(shipment.due).getTime(),
                    id: String(shipment.id),
                    quantity: Number(val.qty)
                })
            }
            sortData<sbt.OnOrder>(item.onOrder, "due")
        }
    }
}