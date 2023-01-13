import {Fees} from "../fees";
import {find} from "../mongo-interface";
import ProcessMargins from "../margin-calculation";
import {Packaging} from "../packaging";
import {Postage} from "../postage";

export default async function UpdateMargins (
    merge = (new Map<string, sbt.Item>()), skus?:string
) {

    console.log("querying margin data!")
    console.log(new Date())

    let query = skus ? {SKU: {$in: skus.replace(/'/g, "").split(",")}} : {};

    const items = await find<sbt.Item>("New-Items", query)

    if(!items) return merge

    console.log("items: " + items.length)

    for (let item of items) {
        let mergeItem = merge.get(item.SKU)
        if(!mergeItem) continue
        merge.set(item.SKU, {...item,...mergeItem})
    }

    let fees = new Fees()
    await fees.initialize()

    let packaging = new Packaging()
    await packaging.initialize()

    let postage = new Postage()
    await postage.initialize()

    for(const [_, item] of merge) await ProcessMargins(item, fees, packaging, postage);
    return merge
}