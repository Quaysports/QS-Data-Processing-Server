import Auth from "../linnworks/auth";
import {getLinnQuery} from "../linnworks/api";
import {find} from "../mongo-interface";

interface SQLQuery {
    linnId: string,
    SKU: string,
    title: string,
    purchasePrice: string,
    retailPrice: string,
    weight: string,
    EAN: string,
    isComposite: string,
    isListingVariation: string,
    packagingGroup: string,
    compositeSKU: string,
    compositeTitle: string,
    compositeQuantity: string,
    compositePurchasePrice: string,
    compositeWeight: string,
    pkRowId: string,
    epName: string,
    epValue: string,
    epType: string
}

export default async function UpdateItems(skus?: string) {
    await Auth(true)
    console.log("skus: " + skus)

    function queryString() {
        return `SELECT si.pkStockItemID       AS linnId,
                       si.ItemNumber          AS SKU,
                       si.ItemTitle           AS title,
                       si.PurchasePrice       AS purchasePrice,
                       si.RetailPrice         AS retailPrice,
                       si.Weight              AS weight,
                       si.BarcodeNumber       AS EAN,
                       si.bContainsComposites AS isComposite,
                       si.IsVariationGroup    AS isListingVariation,
                       si.PackageGroup        AS packagingGroup,
                       si2.ItemNumber         AS compositeSKU,
                       si2.ItemTitle          AS compositeTitle,
                       sic.Quantity           AS compositeQuantity,
                       si2.PurchasePrice      AS compositePurchasePrice,
                       si2.Weight             AS compositeWeight,
                       ep.pkRowId             AS pkRowId,
                       ep.ProperyName         AS epName,
                       ep.ProperyValue        AS epValue,
                       ep.ProperyType         AS epType
                FROM StockItem si
                         LEFT JOIN Stock_ItemComposition sic ON si.pkStockItemId = sic.pkStockItemId
                         LEFT JOIN StockItem si2 ON sic.pkLinkStockItemId = si2.pkStockItemId
                         LEFT JOIN StockItem_ExtendedProperties ep ON si.pkStockItemID = ep.fkStockItemId
                WHERE (si.bLogicalDelete = 0 OR si.IsVariationGroup = 1)
                    ${skus ? "AND si.ItemNumber IN (" + skus + ")" : ""}`
    }

    console.log('Linn update all: All items download')
    console.log(new Date())

    const linnData = (await getLinnQuery<SQLQuery>(queryString())).Results

    let itemsFromDatabase: Map<string, sbt.Item> = await getItemsFromDB(skus);

    let merge = new Map<string, sbt.Item>()

    for (let item of linnData) {
        let base = merge.get(item.linnId) ?? itemsFromDatabase.get(item.linnId) ?? itemTemplate()
        if (!merge.has(item.linnId)) {
            base.prices.purchase = 0
            base.weight = 0
            base.compositeItems = []
            base.extendedProperties = []
        }
        processExtendedProperties(base, item)
        merge.set(item.linnId, updateItem(base, item))

        //if (item.epName) processExtendedProperties(item, merge.get(item.SKU)!)
    }

    console.log('Linn update all: Merge Complete, Saving')
    console.log(new Date())

    return merge
}

function itemTemplate(): sbt.Item {
    return {
        brandLabel: {brand: "", image: "", location: "", path: "", title1: "", title2: ""},
        channelData: [],
        channelReferenceData: [],
        channelPrices: {
            amazon: {id: "", price: 0, status: 0, subSource: "", updateRequired: false, updated: ""},
            ebay: {id: "", price: 0, status: 0, subSource: "", updateRequired: false, updated: ""},
            magento: {id: "", price: 0, status: 0, subSource: "", updateRequired: false, updated: ""},
            shop: {price: 0, status: 0}
        },
        checkboxStatus: {
            done: {
                EAN: false,
                addedToInventory: false,
                amazon: false,
                amazonStore: false,
                ebay: false,
                ebayDraft: false,
                goodsReceived: false,
                inventoryLinked: false,
                jariloTemplate: false,
                magento: false,
                marginsCalculated: false,
                photos: false,
                zenTackle: false
            },
            marginCalculator: {hide: false, amazonOverride: false, ebayOverride: false, magentoOverride: false},
            notApplicable: {amazon: false, amazonStore: false, ebay: false, magento: false, zenTackle: false},
            prime: false,
            ready: {amazon: false, amazonStore: false, ebay: false, magento: false, zenTackle: false},
            stockForecast: {hide: false, list: false}
        },
        description: "",
        discounts: {magento: 0, shop: 0},
        images: {
            image1: {filename: "", id: "", url: "", link: ""},
            image2: {filename: "", id: "", url: "", link: ""},
            image3: {filename: "", id: "", url: "", link: ""},
            image4: {filename: "", id: "", url: "", link: ""},
            image5: {filename: "", id: "", url: "", link: ""},
            image6: {filename: "", id: "", url: "", link: ""},
            image7: {filename: "", id: "", url: "", link: ""},
            image8: {filename: "", id: "", url: "", link: ""},
            image9: {filename: "", id: "", url: "", link: ""},
            image10: {filename: "", id: "", url: "", link: ""},
            image11: {filename: "", id: "", url: "", link: ""},
            main: {filename: "", id: "", url: "", link: ""}
        },
        lastUpdate: "",
        legacyShipping: {expedited: "", expeditedAmazon: "", standard: "", standardEbay: ""},
        linkedSKUS: [],
        marginData: {
            amazon: {fees: 0, primePostage: 0, primeProfit: 0, profit: 0, profitLastYear: 0, salesVAT: 0},
            ebay: {fees: 0, profit: 0, profitLastYear: 0, salesVAT: 0},
            magento: {fees: 0, profit: 0, profitLastYear: 0, salesVAT: 0},
            packaging: 0,
            postage: 0,
            shop: {fees: 0, profit: 0, profitLastYear: 0, salesVAT: 0},
            totalProfitLastYear: 0

        },
        marginNote: "",
        onOrder: [],
        postage: {id: "", modifier: "", price: 0},
        shelfLocation: {letter: "", number: "", prefix: ""},
        shortDescription: "",
        stock: {checkedDate: "", default: 0, minimum: 0, total: 0, value: 0, warehouse: 0},
        stockTake: {checked: false, date: undefined, quantity: 0},
        stockHistory: [],
        supplier: "",
        suppliers: [],
        tags: [],
        webTitle: "",
        EAN: "",
        SKU: "",
        brand: "",
        compositeItems: [],
        extendedProperties: [],
        isComposite: false,
        isListingVariation: false,
        linnId: "",
        mappedExtendedProperties: {
            COMISO2: "GB",
            COMISO3: "GBR",
            amazonDepartment: "",
            amazonLatency: 1,
            amazonSport: "",
            bulletPoint1: "",
            bulletPoint2: "",
            bulletPoint3: "",
            bulletPoint4: "",
            bulletPoint5: "",
            category1: "",
            category2: "",
            searchTerm1: "",
            searchTerm2: "",
            searchTerm3: "",
            searchTerm4: "",
            searchTerm5: "",
            shippingFormat: "",
            specialPrice: "",
            tariffCode: "9507",
            tillFilter: "",
            tradePack: "",
            age: "adult",
            color: "",
            gender: "unisex",
            size: ""
        },
        packaging: {editable: false, group: "", items: [], lock: false},
        prices: {amazon: 0, ebay: 0, magento: 0, purchase: 0, retail: 0, shop: 0},
        title: "",
        till: {color: "#ffffff"},
        weight: 0
    }
}

const updateItem = (item: sbt.Item, linnItem: SQLQuery):sbt.Item => {
    let baseItem = itemTemplate()
    let composite = linnItem.isComposite.toLowerCase() === 'true'

    if (composite) {
        let compositeItem: sbt.CompositeItems = {
            SKU: linnItem.compositeSKU,
            purchasePrice: Math.round(parseFloat(linnItem.compositePurchasePrice) * 100),
            quantity: Number(linnItem.compositeQuantity),
            title: linnItem.compositeTitle,
            weight: linnItem.weight ? parseFloat(linnItem.weight) : 0
        }

        if (!item.compositeItems.map(i => i.SKU).includes(linnItem.compositeSKU)) {
            item.compositeItems.push(compositeItem)
            item.prices.purchase += compositeItem.purchasePrice * compositeItem.quantity
            item.weight += compositeItem.weight * compositeItem.quantity
        }
    } else {
        item.prices.purchase = linnItem.purchasePrice ? Math.round(parseFloat(linnItem.purchasePrice) * 100) : 0
        item.weight = linnItem.weight ? parseFloat(linnItem.weight) : 0
    }

    if (linnItem.epName) {
        let extendedProperty: sbt.LinnExtendedProperty = {
            epName: linnItem.epName,
            epType: linnItem.epType,
            epValue: linnItem.epValue,
            pkRowId: linnItem.pkRowId
        }

        if (!item.extendedProperties.map(i => i.epName).includes(linnItem.epName)) {
            item.extendedProperties.push(extendedProperty)
        }
    }

    return {
        ...item,
        SKU: linnItem.SKU,
        linnId: linnItem.linnId,
        title: linnItem.title,
        EAN: linnItem.EAN,
        isComposite: composite,
        isListingVariation: (linnItem.isListingVariation.toLowerCase() === 'true'),
        packaging: {
            ...item.packaging,
            group: linnItem.packagingGroup
        },
        prices: {
            ...item.prices,
            retail: linnItem.retailPrice ? Math.round(parseFloat(linnItem.retailPrice) * 100) : 0
        },
        tags: cleanTags(item.tags),
        images: {
            main: {...baseItem.images.main, ...item.images.main},
            image1: {...baseItem.images.image1, ...item.images.image1},
            image2: {...baseItem.images.image2, ...item.images.image2},
            image3: {...baseItem.images.image3, ...item.images.image3},
            image4: {...baseItem.images.image4, ...item.images.image4},
            image5: {...baseItem.images.image5, ...item.images.image5},
            image6: {...baseItem.images.image6, ...item.images.image6},
            image7: {...baseItem.images.image7, ...item.images.image7},
            image8: {...baseItem.images.image8, ...item.images.image8},
            image9: {...baseItem.images.image9, ...item.images.image9},
            image10: {...baseItem.images.image10, ...item.images.image10},
            image11: {...baseItem.images.image11, ...item.images.image11},
        },
        channelReferenceData: [],
        mappedExtendedProperties: {
            ...baseItem.mappedExtendedProperties,
            ...item.mappedExtendedProperties
        }
    }
}

export const getItemsFromDB = async (skus?: string): Promise<Map<string, sbt.Item>> => {

    let merge;

    if (skus !== undefined) {
        let skusArr = skus?.replaceAll("'", "").split(",")
        let mergeData = await find<sbt.Item>("New-Items", {SKU: {$in: skusArr}})
        mergeData ? merge = new Map(mergeData.map(item => [item.linnId, item])) : merge = new Map()
    } else {
        let mergeData = await find<sbt.Item>("New-Items", {})
        mergeData ? merge = new Map(mergeData.map(item => [item.linnId, item])) : merge = new Map()
    }
    return merge
}

function cleanTags(tags: string[]) {
    let newTags: string[] = []
    if (tags.length <= 0) return newTags

    for (let tag of tags) {
        if (!newTags.includes(tag)) {
            newTags.push(tag)
        }
    }
    return newTags
}

function processExtendedProperties(item: sbt.Item, linnItem: SQLQuery) {
    let {epName, epValue} = linnItem
    let mapEp = item.mappedExtendedProperties

    switch (epName) {
        case "Brand":
            item.brand = epValue;
            break
        case "Amz Browse Node 1":
            mapEp.category1 = epValue;
            break
        case "Amz Browse Node 2":
            mapEp.category2 = epValue;
            break
        case "Amz Search Term 1":
            mapEp.searchTerm1 = epValue;
            break
        case "Amz Search Term 2":
            mapEp.searchTerm2 = epValue;
            break
        case "Amz Search Term 3":
            mapEp.searchTerm3 = epValue;
            break
        case "Amz Search Term 4":
            mapEp.searchTerm4 = epValue;
            break
        case "Amz Search Term 5":
            mapEp.searchTerm5 = epValue;
            break
        case "Amz Bullet Point 1":
            mapEp.bulletPoint1 = epValue;
            break
        case "Amz Bullet Point 2":
            mapEp.bulletPoint2 = epValue;
            break
        case "Amz Bullet Point 3":
            mapEp.bulletPoint3 = epValue;
            break
        case "Amz Bullet Point 4":
            mapEp.bulletPoint4 = epValue;
            break
        case "Amz Bullet Point 5":
            mapEp.bulletPoint5 = epValue;
            break
        case "Amz Department":
            mapEp.amazonDepartment = epValue;
            break
        case "Sport":
            mapEp.amazonSport = epValue;
            break
        case "Trade Pack":
            mapEp.tradePack = epValue;
            break
        case "Special Price":
            mapEp.specialPrice = epValue;
            break
        case "Shipping Format":
            mapEp.shippingFormat = epValue;
            break
        case "Till Filter":
            mapEp.tillFilter = epValue;
            break
        case "Tags": {
            let tags = epValue.split(",")
            for (let tag of tags) {
                let convertedTag = tag.trim().toLowerCase()
                if (!item.tags.includes(convertedTag)) {
                    item.tags.push(convertedTag)
                }
            }
            break
        }
        case "Color":
            mapEp.color = epValue;
            break
        case "Size":
            mapEp.size = epValue;
            break
        case "Gender":
            mapEp.gender = epValue;
            break
        case "Age":
            mapEp.age = epValue;
            break
    }
}