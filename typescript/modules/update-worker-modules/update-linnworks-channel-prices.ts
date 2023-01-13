import mongoI = require("../mongo-interface");
import Auth from "../linnworks/auth";

import GetLinnworksChannelPrices from "./get-linnworks-channel-prices";
import {updateLinnItem} from "../linnworks/api"
import {GUID} from "../utilities";

export default async function UpdateLinnworksChannelPrices(
    merge: Map<string, sbt.Item> = new Map<string, sbt.Item>(), data?: sbt.Item[]
) {
    await Auth(true)
    await mongoI.bulkUpdateItems(await GetLinnworksChannelPrices())

    let amazonQuery, ebayQuery, magentoQuery


    let argSkuList = data ? data.map(item => item.SKU) : undefined
    amazonQuery = await mongoI.findAggregate<QueryResult>(
        "Items",
        generateAggrigationQuery("amazon", argSkuList)
    )
    ebayQuery = await mongoI.findAggregate<QueryResult>(
        "Items",
        generateAggrigationQuery("ebay", argSkuList)
    )
    magentoQuery = await mongoI.findAggregate<QueryResult>(
        "Items",
        generateAggrigationQuery("magento", argSkuList)
    )

    let updates = new Map<string, object[]>([
        ["//api/Inventory/UpdateInventoryItemPrices", []],
        ["//api/Inventory/CreateInventoryItemPrices", []],
    ])

    let skuList = ''
    if (amazonQuery && amazonQuery.length > 0) {
        for (let itemResult of amazonQuery) {
            skuList === '' ? skuList = `'${itemResult.SKU}'` : skuList += `,'${itemResult.SKU}'`
            addPriceToUpdateMap(updates, 'AMAZON', 'Silver Bullet Trading Ltd', itemResult.AMZPRICEINCVAT!.toString(), itemResult.LINNID, itemResult.CHANNELID)
        }
    }
    if (ebayQuery && ebayQuery.length > 0) {
        for (let itemResult of ebayQuery) {
            skuList === '' ? skuList = `'${itemResult.SKU}'` : skuList += `,'${itemResult.SKU}'`
            addPriceToUpdateMap(updates, 'EBAY', 'EBAY1_UK', itemResult.EBAYPRICEINCVAT!.toString(), itemResult.LINNID, itemResult.CHANNELID)
        }
    }
    if (magentoQuery && magentoQuery.length > 0) {
        for (let itemResult of magentoQuery) {
            console.dir(itemResult, {depth: 7})
            skuList === '' ? skuList = `'${itemResult.SKU}'` : skuList += `,'${itemResult.SKU}'`
            addPriceToUpdateMap(updates, 'MAGENTO', 'http://quaysports.com', itemResult.QSPRICEINCVAT!.toString(), itemResult.LINNID, itemResult.CHANNELID)
        }
    }

    console.dir(updates, {depth: 7})

    await batchUpdateFromMap(updates)

    await mongoI.bulkUpdateItems(await GetLinnworksChannelPrices(merge, skuList))

    return {status: "done!"}

}

function addPriceToUpdateMap(map: Map<string, object[]>, source: string, subsource: string, price: string, linnid: string, id?: string) {
    if (id) {
        map.get("//api/Inventory/UpdateInventoryItemPrices")!.push({
            pkRowId: id,
            Source: source,
            SubSource: subsource,
            Price: price,
            UpdateStatus: 0,
            Tag: '',
            Rules: [],
            StockItemId: linnid
        })
    } else {
        map.get("//api/Inventory/CreateInventoryItemPrices")!.push({
            pkRowId: GUID(),
            Source: source,
            SubSource: subsource,
            Price: price,
            StockItemId: linnid
        })
    }
}

const batchUpdateFromMap = async (updates: Map<string, object[]>) => {
    console.dir(updates, {depth: 5})
    let results: object[] = []

    for (const [path, array] of updates) {
        let prefix = ""
        if (array.length === 0) continue
        if (path.includes("ItemPrices")) prefix = "inventoryItemPrices="
        if (path.includes("ItemExtendedProperties")) prefix = "inventoryItemExtendedProperties="

        console.log("updating " + path + " " + array.length)
        for (let i = 0; i < array.length; i += 250) {
            let result = await updateLinnItem(path, `${prefix}${JSON.stringify(array.slice(i, i + 250))}`)
            results.push(result)
        }
    }
    return results
}

interface QueryResult {
    SKU: string
    LINNID: string
    CHANNELID: string
    QSPRICEINCVAT?: number
    QSCHANNELPRICE?: number
    AMZPRICEINCVAT?: number
    AMZCHANNELPRICE?: number
    EBAYPRICEINCVAT?: number
    EBAYCHANNELPRICE?: number
}

function generateAggrigationQuery(channel: "amazon" | "ebay" | "magento", skus?: string[]) {
    let query = [
        {
            '$match': {
                'isListingVariation': false
            }
        },
        {
            'SKU': 1,
            'linnId': 1,
            'channelId': `$channelPrices.${channel}.id`,
            'price': `$prices.${channel}`,
            'channelPrice': {
                '$convert': {
                    'input': `$channelPrices.${channel}.price`,
                    'to': 'double',
                    'onNull': 0,
                    'onError': 0
                }
            }
        }, {
            '$match': {
                '$or': [
                    {
                        '$expr': {
                            '$ne': [
                                '$price', '$channelPrice'
                            ]
                        }
                    }
                ]
            }
        }
    ]

    if (skus) { // @ts-ignore
        query[0].$match.SKU = {$in: skus}
    }

    return query

}