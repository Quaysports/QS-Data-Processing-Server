import {findOne, setData} from "../mongo-interface";
import {processOrders} from "./process-orders";
import {getLinnQuery} from "../linnworks/api";

export interface LinnOrdersSQLResult{
    name: string
    email: string
    postcode: string
    date: string
    id: string
    source: "AMAZON" | "EBAY" | "MAGENTO" | "DIRECT" | "OnBuy v2"
    postalid: string
    extRef: string
    tracking: string
    address1: string
    address2: string
    address3: string
    town: string
    region: string
    phone: string
    price: string
    unitPrice: string
    sku: string
    qty: string
    weight: string
    packaging: string
    packagingWeight: string
    composite: string
}

export interface OnlineOrder {
    _id?: { $oid: string };
    id: string;
    address1: string;
    address2: string;
    address3: string;
    composite: any[];
    date: string;
    email: string;
    extRef: string;
    items: { qty: number; weight: number; sku: string }[];
    name: string;
    packaging: { weight: number; type: string, cost: number }
    phone: string;
    postalid: string;
    postcode: string;
    price: string;
    prices: { price: number; qty: number; sku: string, profitPerItem:number }[];
    profit: number;
    postageCost: number;
    region: string;
    source: "AMAZON" | "EBAY" | "MAGENTO" | "DIRECT" | "OnBuy v2";
    totalWeight: number;
    town: string;
    tracking: string;
    scanned?: { min: number; correct: boolean; max: number; scaleWeight: number; diff: number; time: Date; per: number };
}

export interface NewOnlineOrder {
    _id?: { $oid: string };
    id: string;
    date: string;
    price: number;
    profit: number;
    source: "amazon" | "ebay" | "magento" | "direct" | "onbuy v2";
    customerDetails:CustomerDetails
    orderDetails:OrderDetails
    packaging: Packaging
    postage: Postage
    scanned?: Scanned
}

export interface CustomerDetails {
    name: string;
    address1: string;
    address2: string;
    address3: string;
    town: string;
    region: string;
    postcode: string;
    email: string;
    phone: string;
}

export interface OrderDetails {
    composite: CompositeDetails[];
    items: ItemDetails[];
    prices: ItemPriceDetails[];
    channelId: string;
    weight:number;
}

export interface CompositeDetails {
    SKU: string;
    quantity: number;
}

export interface ItemDetails {
    SKU: string;
    quantity: number;
    weight: number;
}

export interface ItemPriceDetails {
    SKU: string;
    price: number;
    quantity: number;
    profitPerItem: number;
}

export interface Packaging { weight: number; type: string; cost: number }
export interface Postage { id: string; cost: number; tracking: string }
export interface Scanned { min: number; correct: boolean; max: number; scaleWeight: number; diff: number; time: Date; per: number }


export const init = async () => {
    await linnGet()
    setInterval(() => { linnGet() }, 300000)
}

export const linnGet = async () => {
    let queryDate = await findOne<any>("Server", {id: "Orders"})

    let sqlDate = new Date(queryDate.lastUpdate)
    let toSqlDate = new Date(sqlDate.getTime() + 15778800000)
    let toSqlDateString = toSqlDate.toISOString().slice(0, 19).toString().replace('T', ' ')
    let sqlDateString = sqlDate.toISOString().slice(0, 19).toString().replace('T', ' ')

    let qResult = await getLinnQuery<LinnOrdersSQLResult>(
        `SELECT 
                o.cFullName AS 'name', 
                o.cEmailAddress AS 'email', 
                o.cPostCode AS 'postcode', 
                o.dProcessedOn AS 'date', 
                o.nOrderId AS 'id', 
                o.Source AS 'source', 
                o.fkPostalServiceId AS 'postalid', 
                o.ExternalReference AS 'extRef', 
                o.PostalTrackingNumber AS 'tracking', 
                o.Address1 AS 'address1', 
                o.Address2 AS 'address2', 
                o.Address3 AS 'address3', 
                o.Town AS 'town', 
                o.Region AS 'region', 
                o.BuyerPhoneNumber AS 'phone', 
                o.fTotalCharge AS 'price', 
                oi.fPricePerUnit AS 'unitPrice', 
                si.ItemNumber AS 'sku', 
                oi.nQty AS 'qty', 
                si.Weight AS weight,
                pt.PackageTitle AS packaging,
                pt.PackagingWeight AS packagingWeight,
                si.bContainsComposites AS 'composite'
         FROM [Order] o
             INNER JOIN OrderItem oi ON o.pkOrderID = oi.fkOrderID
             INNER JOIN PackageGroups pg ON o.fkPackagingGroupId = pg.PackageCategoryID
             INNER JOIN PackageTypes pt ON pg.PackageCategoryID = pt.PackageGroupID
             INNER JOIN StockItem si on oi.fkStockItemId_processed = si.pkStockItemID
         WHERE
             Convert (DATETIME, o.dProcessedOn) >= Convert (DATETIME, '${sqlDateString}')
            AND
             Convert (DATETIME, o.dProcessedOn) <= Convert (DATETIME, '${toSqlDateString}')
           AND
             o.Source <> 'Shop'
         ORDER BY o.nOrderId`
    )

    let data = qResult.Results
    if (data) console.log("New orders found: " + data.length)
    let currentDate = new Date()
    await setData("Server", {id: "Orders"}, {lastUpdate: toSqlDate < currentDate ? toSqlDate : currentDate})

    if (data && data.length > 0) await processOrders(data)

    return
}

export const get = async (query:object) => {
    return await findOne<OnlineOrder>("Orders", query)
}

export const update = async (item:OnlineOrder) => {
    if (item._id !== undefined) delete item._id
    await setData("Orders", {id: item.id}, item)
    return {done: true}
}

/*
export const compare = async (data: { orderId: string; weight: number; }) => {
    const order = await get({tracking: data.orderId})
    if(!order) return
    return await processItem(order, data.weight)
}

const processItem = async (order:OnlineOrder, weight: number) => {
    if (!order) {
        return {status: false, lastUpdate: lastUpdate}
    }

    const minMulti = order.totalWeight > 2000 ? 0.99 : 0.98;
    const maxMulti = order.totalWeight > 2000 ? 1.01 : 1.02;
    order.scanned = {
        time: new Date(),
        scaleWeight: weight,
        correct: false,
        min: order.totalWeight * minMulti,
        max: order.totalWeight * maxMulti,
        diff: weight - order.totalWeight,
        per: (100 / order.totalWeight) * (weight - order.totalWeight)
    }
    if (weight >= order.scanned.min && weight <= order.scanned.max) {
        order.scanned.correct = true
    }

    if (order._id !== undefined) delete order._id

    await setData("Orders", {id: order.id}, order)
    return {status: true, order: order}
}

export const onlineSalesSpan = async () => {
    const result = await findAggregate<OnlineSalesReport>("Online-Reports", [
        {$group: {_id: null, first: {$first: '$$ROOT'}, last: {$last: '$$ROOT'}}},
        {$project: {first: {date: 1}, last: {date: 1}}}
    ])
    return result ? result[0] : null
}

export const onlineSalesYearTotal = async (firstDay:string, lastDay:string) => {
    return await findAggregate<OnlineSalesReport>("Online-Reports", [
        {$match: {$and: [{date: {$gte: firstDay}}, {date: {$lte: lastDay}}]}},
        {
            $group: {
                _id: null,
                total: {$sum: {$add: ["$transactions.ebay", "$transactions.amazon", "$transactions.quaysports"]}},
                totalProfit: {$sum: "$transactions.profit"}
            }
        }
    ])
}

export const onlineSalesMonthTotal = async (firstDay:string, lastDay:string) => {
    return await findAggregate<OnlineSalesReport>("Online-Reports", [
        {$match: {$and: [{date: {$gte: firstDay}}, {date: {$lte: lastDay}}]}},
        {
            $group: {
                _id: null,
                amazon: {$sum: "$transactions.amazon"},
                ebay: {$sum: "$transactions.ebay"},
                quaySports: {$sum: "$transactions.quaysports"},
                total: {$sum: {$add: ["$transactions.ebay", "$transactions.amazon", "$transactions.quaysports"]}},
                totalProfit: {$sum: "$transactions.profit"}
            }
        }
    ])
}

export const onlineSalesByMonth = async (firstDay:string, lastDay:string) => {
    return await find<OnlineSalesReport>("Online-Reports", {$and: [{date: {$gt: firstDay}}, {date: {$lt: lastDay}}]})
}*/