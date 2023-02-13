import {bulkUpdateItems, find} from "../mongo-interface";

export async function unHideAll() {

    let items = await find<sbt.Item>(
        "Items",
        {"checkboxStatus.marginCalculator.hide": true},
        {SKU: 1, checkboxStatus: 1})

    if (!items) return

    for (let item of items) {
        item.checkboxStatus.marginCalculator.hide = false
    }

    const itemsMap: Map<string, sbt.Item> = new Map(items.map(item => [item.SKU, item]))

    let result = await bulkUpdateItems(itemsMap)

    console.log(result)
}

export async function removeOverrides() {
    console.log("remove overrides!")
    let items = await find<sbt.Item>(
        "Items",
        {
            $or: [
                {"checkboxStatus.marginCalculator.ebayOverride": true},
                {"checkboxStatus.marginCalculator.amazonOverride": true},
                {"checkboxStatus.marginCalculator.magentoOverride": true},
            ]
        },
        {SKU: 1, checkboxStatus: 1})

    if (!items) return

    for (let item of items) {
        item.checkboxStatus.marginCalculator = {
            ...item.checkboxStatus.marginCalculator,
            ...{
                ebayOverride: false,
                amazonOverride: false,
                magentoOverride: false,
            }
        }
    }

    const itemsMap: Map<string, sbt.Item> = new Map(items.map(item => [item.SKU, item]))

    let result = await bulkUpdateItems(itemsMap)

    console.log(result)
}