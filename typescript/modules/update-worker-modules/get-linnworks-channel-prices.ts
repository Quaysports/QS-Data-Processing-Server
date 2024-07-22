import Auth from "../linnworks/auth";
import {getLinnQuery} from "../linnworks/api";
import {getItemsFromDB} from "./update-items";

export interface ListingDescriptionsSQLQuery {
    ItemNumber: string,
    linnId: string,
    Source:"amazon" | "ebay" | "magento" | "onbuy",
    SubSource:string,
    Price:string,
    UpdateStatus:string,
    pkRowId:string
}

export interface ExtendedPropertiesSQLQuery {
    linnId: string,
    epName: string,
    epValue:string,
    epType:string,
    pkRowId:string
}

export default async function GetLinnworksChannelPrices(
    merge:undefined | Map<string,sbt.Item> = undefined, skus?:string
) {
    await Auth(true)
    console.log("querying CP data!")
    console.log(new Date())

    if(!merge) { merge = await getItemsFromDB(skus) }

    let listingDescriptionsQuery = `SELECT si.pkStockItemId as linnId,
                        sp.Source,
                        sp.SubSource,
                        sp.SalePrice as Price,
                        sp.UpdateStatus,
                        sp.pkRowId
                 FROM StockItem si
                          INNER JOIN StockItem_Pricing sp on si.pkStockItemId = sp.fkStockItemId
                 WHERE si.bLogicalDelete = 0
                   AND sp.SubSource <> 'https://quaysports.com'
                     ${skus ? "AND si.ItemNumber IN (" + skus + ")" : ""}`

    let extendedPropertiesQuery = `SELECT
                    ep.fkStockItemId AS linnId,
                    ep.ProperyName AS epName,
                    ep.ProperyValue AS epValue,
                    ep.ProperyType AS epType,
                    ep.pkRowId AS pkRowId
                FROM StockItem_ExtendedProperties ep
                LEFT JOIN StockItem si ON ep.fkStockItemId = si.pkStockItemId
                LEFT JOIN Stock_ItemComposition sic ON si.pkStockItemId = sic.pkStockItemId
                LEFT JOIN StockItem si2 ON sic.pkLinkStockItemId = si2.pkStockItemId
                WHERE (si.bLogicalDelete = 0 OR si.IsVariationGroup = 1)
                    ${skus ? "AND si.ItemNumber IN (" + skus + ")" : ""}`;

    
    const result = (await getLinnQuery<ListingDescriptionsSQLQuery>(listingDescriptionsQuery)).Results
    const extendedProperties = (await getLinnQuery<ExtendedPropertiesSQLQuery>(extendedPropertiesQuery)).Results
    if (extendedProperties) {
        const specialPriceItems = extendedProperties.filter(item => item.epName === "Special Price");

        for (let item of specialPriceItems) {
            const { linnId, epName, pkRowId, epValue, epType } = item;

            let mergeItem = merge.get(linnId);
            if (!mergeItem) continue;

            let extendedPropertiesData: sbt.LinnExtendedProperty = {
                epName: epName,
                epType: epType,
                epValue: epValue,
                pkRowId: pkRowId
            };

            // Find the index of the existing item with epName "Special Price"
            const index = mergeItem.extendedProperties.findIndex(prop => prop.epName === "Special Price");

            // If found, replace it; otherwise, push the new item
            if (index !== -1) {
                mergeItem.extendedProperties[index] = extendedPropertiesData;
            } else {
                mergeItem.extendedProperties.push(extendedPropertiesData);
            }
        }
    }


    for (let item of result) {
        const {linnId, Source, SubSource, Price, UpdateStatus, pkRowId} = item
        const channelPricesKey = Source.toLowerCase() as keyof sbt.Item["channelPrices"]
        const newPrice = Math.round(parseFloat(Price) * 100)

        let mergeItem = merge.get(linnId)

        if (!mergeItem) continue

        mergeItem!.channelPrices ??= {
            amazon: {
                id: "",
                price: 0,
                status: 0,
                subSource: "",
                updateRequired: false,
                updated: ""
            },
            ebay: {id: "", price: 0, status: 0, subSource: "", updateRequired: false, updated: ""},
            magento: {id: "", price: 0, status: 0, subSource: "", updateRequired: false, updated: ""},
            "onbuy v2": {id: "", price: 0, status: 0, subSource: "", updateRequired: false, updated: ""},
            shop: {price: 0, status: 0}
        }

        let channelPriceData:sbt.ChannelPriceData = {
            id: pkRowId ? pkRowId : "",
            status: UpdateStatus ? Number(UpdateStatus) : 0,
            updateRequired: false,
            price: newPrice,
            subSource: SubSource,
            updated: (new Date()).toString()
        }

        switch(Source.toLowerCase()){
            case "amazon": if(mergeItem.prices.amazon !== newPrice) channelPriceData.updateRequired = true; break;
            case "ebay": if(mergeItem.prices.ebay !== newPrice) channelPriceData.updateRequired = true; break;
            case "magento": if(mergeItem.prices.magento !== newPrice) channelPriceData.updateRequired = true; break;
        }

        mergeItem.channelPrices[channelPricesKey] = channelPriceData
    }
    return merge
}