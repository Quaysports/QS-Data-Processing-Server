import {LinnOrdersSQLResult, NewOnlineOrder} from "./orders";
import {bulkUpdateAny, find} from "../mongo-interface";

export const processOrders = async (data: LinnOrdersSQLResult[]) => {
    let arr:NewOnlineOrder[] = []

    let skus = data.reduce((acc:string[], item) => {
        if(!acc.includes(item.sku)) acc.push(item.sku)
        return acc
    },[])

    let itemData = await find<Pick<sbt.Item, "marginData" | "SKU">>("New-Items", {SKU: {$in: skus}}, {marginData: 1, SKU: 1})

    if(!itemData) return

    const marginData = new Map(itemData.map(item => [item.SKU, item]))

    for (const item of data) {

        let i = arr.map(arrItem => arrItem.id).indexOf(item.id)

        if (i === -1) {
            let obj: NewOnlineOrder = {
                customerDetails: {
                    address1: item.address1 || "",
                    address2: item.address2 || "",
                    address3: item.address3 || "",
                    email: item.email || "",
                    name: item.name || "",
                    phone: item.phone || "",
                    postcode: item.postcode || "",
                    region: item.region || "",
                    town: item.town || ""
                },
                date: new Date(item.date).getTime().toString() || "",
                id: item.id || "",
                orderDetails: {
                    composite: [],
                    channelId: item.extRef || "",
                    items: [],
                    prices: [],
                    weight: 0
                },
                packaging: {
                    type: "",
                    weight: 0,
                    cost:0
                },
                postage: {
                    cost: marginData.has(item.sku) ? marginData.get(item.sku)!.marginData.postage : 0,
                    id: item.postalid || "",
                    tracking: item.tracking || ""
                },
                price: Math.round(parseFloat(item.price) * 100),
                profit: 0,
                source: item.source.toLowerCase() as "amazon" | "ebay" | "magento" | "direct" | "onbuy v2",
            }
            arr.push(obj)
            i = arr.length - 1
        }

        processSQLtoOrder(item, arr[i], marginData)
    }

    await bulkUpdateAny("Online-Orders", arr, "id")

    return
}

function processSQLtoOrder(
    item: LinnOrdersSQLResult,
    order: NewOnlineOrder,
    marginData: Map<string, Pick<sbt.Item, "marginData" | "SKU">>
) {

    //if the item has a price push it to the prices array
    if (parseFloat(item.unitPrice) > 0) {
        let profit = getMarginProfit(order.source, marginData.get(item.sku)?.marginData)
        order.orderDetails.prices.push({
            SKU: item.sku,
            quantity: parseFloat(item.qty),
            price: Math.round(parseFloat(item.unitPrice) * 100),
            profitPerItem: profit
        })
        order.profit += parseFloat(item.qty) * profit
    }

    if(parseFloat(item.packagingWeight) > order.packaging.weight){
        // add the weight difference to the total weight
        order.orderDetails.weight += parseFloat(item.packagingWeight) - order.packaging.weight
        order.packaging = {
            type: item.packaging,
            weight: parseFloat(item.packagingWeight),
            cost: marginData.has(item.sku) ? marginData.get(item.sku)!.marginData.packaging : 0
        }
    }

    if (item.composite === "False") {
        //push non-composite items to the items array
        order.orderDetails.items.push({
            SKU: item.sku,
            quantity: parseFloat(item.qty),
            weight: parseFloat(item.weight)
        })
        //add the weight of the item to the total weight
        order.orderDetails.weight += parseFloat(item.weight) * parseFloat(item.qty)
    } else {
        //push composite item to the composite array (to separate it for individual items)
        order.orderDetails.composite.push({
            SKU: item.sku,
            quantity: parseFloat(item.qty)
        })
    }
}

function getMarginProfit(channel:"amazon" | "ebay" | "magento" | "direct" | "onbuy v2", marginData?:sbt.Item["marginData"]){
    if(channel === "direct" || !marginData) return 0
    if (marginData[channel]?.profit) {
        return marginData[channel]?.profit
    } else {
        return 0
    }
}