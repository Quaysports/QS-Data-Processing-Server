import Auth from "../linnworks/auth";
import GetLinnworksChannelPrices from "./get-linnworks-channel-prices";
import {getLinnQuery, updateLinnItem} from "../linnworks/api"
import {GUID} from "../utilities";
import {bulkUpdateItems, findAggregate} from "../mongo-interface";
import UpdateItems, { SQLQuery, getItemsFromDB } from "./update-items";

export default async function UpdateLinnworksChannelPrices(
    merge: Map<string, sbt.Item> = new Map<string, sbt.Item>(), data?: sbt.Item[]
) {

    let argSkuList = data ? data.map(item => item.SKU) : undefined
    let skuList = data ? data.reduce((str, item) => {
        return str === '' ? `'${item.SKU}'` : str + `,'${item.SKU}'`
    }, "") : ""

    await Auth(true)
    await bulkUpdateItems(await GetLinnworksChannelPrices(undefined, skuList))

    let amazonQuery = await findAggregate<QueryResult>(
        "New-Items",
        generateAggregationQuery("amazon", argSkuList)
    )
    let ebayQuery = await findAggregate<QueryResult>(
        "New-Items",
        generateAggregationQuery("ebay", argSkuList)
    )
    let magentoQuery = await findAggregate<QueryResult>(
        "New-Items",
        generateAggregationQuery("magento", argSkuList)
    )
    let onbuyQuery = await findAggregate<QueryResult>(
        "New-Items",
        generateAggregationQuery("onbuy v2", argSkuList)
    )
    
    // updates extendedProprties for Magento Special Price
    let extendedPropertiesMagentoSpecialQuery = await findAggregate<SpecialPriceQueryResult>(
        "New-Items",
        specialPriceQuery(argSkuList)
    )

    let updates = new Map<string, object[]>([
        // Linnworks - update 'listing descriptions' vendor channel prices
        ["//api/Inventory/UpdateInventoryItemPrices", []],
        ["//api/Inventory/CreateInventoryItemPrices", []],
        // Linnworks - update 'extended properties' - for special price
        ["//api/Inventory/UpdateInventoryItemExtendedProperties", []],
        ["//api/Inventory/CreateInventoryItemExtendedProperties", []]
    ])

    skuList = ''
    if (amazonQuery && amazonQuery.length > 0) {
        for (let itemResult of amazonQuery) {
            skuList = skuList === '' ? `'${itemResult.SKU}'` : skuList + `,'${itemResult.SKU}'`
            addPriceToUpdateMap(updates, 'AMAZON', 'Silver Bullet Trading Ltd', itemResult.price, itemResult.linnId, itemResult.channelId)
        }
    }
    if (ebayQuery && ebayQuery.length > 0) {
        for (let itemResult of ebayQuery) {
            skuList = skuList === '' ? `'${itemResult.SKU}'` : skuList + `,'${itemResult.SKU}'`
            addPriceToUpdateMap(updates, 'EBAY', 'EBAY1_UK', itemResult.price, itemResult.linnId, itemResult.channelId)
        }
    }
    if (magentoQuery && magentoQuery.length > 0) {
        for (let itemResult of magentoQuery) {
            skuList = skuList === '' ? `'${itemResult.SKU}'` : skuList + `,'${itemResult.SKU}'`
            addPriceToUpdateMap(updates, 'MAGENTO', 'http://quaysports.com', itemResult.price, itemResult.linnId, itemResult.channelId)
        }
    }
    if (onbuyQuery && onbuyQuery.length > 0) {
        for (let itemResult of onbuyQuery) {
            skuList = skuList === '' ? `'${itemResult.SKU}'` : skuList + `,'${itemResult.SKU}'`
            addPriceToUpdateMap(updates, 'OnBuy v2', 'onbuy', itemResult.price, itemResult.linnId, itemResult.channelId)
        }
    }
    if (extendedPropertiesMagentoSpecialQuery && extendedPropertiesMagentoSpecialQuery.length > 0 && extendedPropertiesMagentoSpecialQuery[0].magentoSpecialPrice !== 0) {
        for (let itemResult of extendedPropertiesMagentoSpecialQuery) {
            skuList = skuList === '' ? `'${itemResult.SKU}'` : skuList + `,'${itemResult.SKU}'`
            addSpecialPriceToUpdateMap(updates, itemResult.pkRowId, itemResult.linnId, ((itemResult.magentoSpecialPrice / 100).toFixed(2)))
        }
    }

    await batchUpdateFromMap(updates)

    await bulkUpdateItems(await GetLinnworksChannelPrices(merge, skuList))

    return {status: "done!"}

}

function addPriceToUpdateMap(map: Map<string, object[]>, source: string, subsource: string, price: number, linnid: string, id?: string) {
    if (id) {
        map.get("//api/Inventory/UpdateInventoryItemPrices")!.push({
            pkRowId: id,
            Source: source,
            SubSource: subsource,
            Price: (price / 100).toFixed(2),
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
            Price: (price / 100).toFixed(2),
            UpdateStatus: 0,
            StockItemId: linnid
        })
    }
}

function addSpecialPriceToUpdateMap(map: Map<string, object[]>, id: string, linnId: string, price: string, sku?: string) {
    if (id) { // to update
        map.get("//api/Inventory/UpdateInventoryItemExtendedProperties")!.push({
            pkRowId: id,
            fkStockItemId: linnId,
            ProperyName: 'Special Price',
            PropertyValue: `${price}`,
            PropertyType: 'Attribute'
        })
    } else { // to create
        map.get("//api/Inventory/CreateInventoryItemExtendedProperties")!.push({
            fkStockItemId: linnId,
            SKU: sku,
            PropertyType: "Attribute",
            PropertyValue: `${price}`,
            ProperyName: 'Special Price'
        })
    }
}

const batchUpdateFromMap = async (updates: Map<string, object[]>) => {

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
    linnId: string
    channelId: string
    price: number
    channelPrice: number
}

interface SpecialPriceQueryResult {
    SKU: string
    linnId: string
    magentoSpecialPrice: number
    pkRowId: string
    expropSpecialPrice: number
}

function generateAggregationQuery(channel: "amazon" | "ebay" | "magento" | "magentoSpecial" | "onbuy v2", skus?: string[]) {
    let query = [
        {
            '$match': {
                'isListingVariation': false
            }
        },
        {
            '$project': {
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

function specialPriceQuery(skus?: string[]) {
    let query = [
        {
            '$match': {
                'isListingVariation': false,
                'prices.magentoSpecial': { '$exists': true }
            }
        },
        {
            '$project': {
                'SKU': 1,
                'linnId': 1,
                'extendedProperties': {
                    '$filter': {
                        'input': '$extendedProperties',
                        'as': 'ep',
                        'cond': { '$eq': ['$$ep.epName', 'Special Price'] }
                    }
                },
                'magentoSpecialPrice': '$prices.magentoSpecial' 
            }
        },
        {
            '$unwind': {
                'path': '$extendedProperties',
                'preserveNullAndEmptyArrays': true
            }
        },
        {
            '$project': {
                'SKU': 1,
                'linnId': 1,
                'ep': '$extendedProperties',
                'magentoSpecialPrice': 1
            }
        },
        {
            '$project': {
                'SKU': 1,
                'linnId': 1,
                'magentoSpecialPrice': 1,
                'pkRowId': '$ep.pkRowId',
                'expropSpecialPrice': '$ep.epValue'
            }
        }
    ];    

    if (skus) { // @ts-ignore
        query[0].$match.SKU = {$in: skus}
    }

    return query
}
