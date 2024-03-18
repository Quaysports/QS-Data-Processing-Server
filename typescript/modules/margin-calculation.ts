import {FeesClass} from "./fees";
import {PackagingClass} from "./packaging";
import {PostageClass} from "./postage";

export default async function ProcessMargins(item: sbt.Item, Fees: FeesClass, Packaging: PackagingClass, Postage: PostageClass) {
    item.marginData = {
        amazon: {fees: 0, primePostage: 0, primeProfit: 0, profit: 0, profitLastYear: 0, salesVAT: 0},
        ebay: {fees: 0, profit: 0, profitLastYear: 0, salesVAT: 0},
        magento: {fees: 0, profit: 0, profitLastYear: 0, salesVAT: 0},
        packaging: 0,
        postage: 0,
        shop: {fees: 0, profit: 0, profitLastYear: 0, salesVAT: 0},
        totalProfitLastYear: 0
    }

    await getPostageAndPackaging(item, Packaging, Postage)
    await getAmazonListingCosts(item, Fees);
    await getMagentoListingCosts(item, Fees);
    await getEbayListingCosts(item, Fees);
    await getShopListingCosts(item, Fees);
    if(!item.test) await getLastYearChannelProfits(item);
    return
}

const getPostageAndPackaging = async (item: sbt.Item, Packaging: PackagingClass, Postage: PostageClass) => {

    if(item.mappedExtendedProperties){
        if(!item.postage.id){
            switch(item.mappedExtendedProperties.shippingFormat){
                case "RM Large Letter": item.postage.id = "350325c8-a504-4f4b-b66b-d45c0305d4c1"; break;
                case "RM Packet": item.postage.id = "82957a90-fcd3-4a57-8957-647a2380cacb"; break;
                case "Courier": item.postage.id = "ecc31609-5f9c-9f0f-6b8f-45e874d698f5"; break;
                default: item.postage.id = "82957a90-fcd3-4a57-8957-647a2380cacb";
            }
        }
    }

    let postage = await Postage.find(item.postage.id)
    if (!postage) postage = {format: "", tag: "", vendor: "", cost: 0, id: ""}
    item.marginData.postage = modifyPostVal(postage.cost, item.postage.modifier)

    let amazonPrimePostage = await Postage.find("30823674-1131-4087-a2d0-c50fe871548e")
    if (!amazonPrimePostage) amazonPrimePostage = {format: "", tag: "", vendor: "", cost: 0, id: "30823674-1131-4087-a2d0-c50fe871548e"}
    item.marginData.amazon.primePostage = modifyPostVal(amazonPrimePostage.cost, item.postage.modifier)

    function modifyPostVal(postVal: number, mod: string | number = '0'): number {
        if (mod !== 'x2' && mod !== 'x3') return postVal + Number(mod)
        switch (mod) {
            case 'x2':
                return postVal * 2
            case 'x3':
                return postVal * 3
            default:
                return postVal
        }
    }

    let packaging = await Packaging.find(item.packaging.group)
    item.marginData.packaging = packaging?.price || 10
}

const getAmazonListingCosts = async (item: sbt.Item, Fees: FeesClass) => {

    if (item.tags.includes("domestic")) {
        if (!item.prices.amazon) item.prices.retail ? item.prices.amazon = item.prices.retail : 0;
        item.channelPrices.amazon.updateRequired = item.channelPrices.amazon.price !== item.prices.amazon
    }

    if (!item.prices.amazon) {
        item.marginData.amazon.profit = 0;
        item.marginData.amazon.primeProfit = 0;
        return
    } else {
        item.marginData.amazon.fees = Fees.calc('amazon', item.prices.amazon)
        item.marginData.amazon.salesVAT = item.prices.amazon - (item.prices.amazon / Fees.VAT());

        item.marginData.amazon.profit = item.prices.amazon - (
            item.prices.purchase +
            item.marginData.postage +
            item.marginData.packaging +
            item.marginData.amazon.fees +
            item.marginData.amazon.salesVAT
        )

        item.marginData.amazon.primeProfit = item.prices.amazon - (
            item.prices.purchase +
            item.marginData.amazon.primePostage +
            item.marginData.packaging +
            item.marginData.amazon.fees +
            item.marginData.amazon.salesVAT
        )

        return
    }
}

const getEbayListingCosts = async (item: sbt.Item, Fees: FeesClass) => {

    if (item.tags.includes("domestic")) {
        if (!item.prices.ebay) item.prices.retail ? item.prices.ebay = item.prices.retail : 0;
        item.channelPrices.ebay.updateRequired = item.channelPrices.ebay.price !== item.prices.ebay
    }

    if (!item.prices.ebay) {
        item.marginData.ebay.profit = 0;
        return
    } else {
        item.marginData.ebay.fees = Fees.calc('ebay', item.prices.ebay)
        item.marginData.ebay.salesVAT = item.prices.ebay - (item.prices.ebay / Fees.VAT());
        item.marginData.ebay.profit = item.prices.ebay - (
            item.prices.purchase +
            item.marginData.postage +
            item.marginData.packaging +
            item.marginData.ebay.fees +
            item.marginData.ebay.salesVAT
        )
        return
    }
}

const getMagentoListingCosts = async (item: sbt.Item, Fees: FeesClass) => {

    if (item.tags.includes("domestic")) {
        if (item.discounts.magento === 0) item.discounts.magento = 5
        if (item.discounts.magento > 0) {
            item.discounts.magento += 5
        }
        if (!item.prices.magentoSpecial) item.prices.retail ? item.prices.magentoSpecial = roundToNearest(item.prices.retail * 0.95) : 0;
        // if (!item.prices.magentoSpecial || item.prices.magentoSpecial === 0) item.discounts.magento ? item.prices.magentoSpecial = roundToNearest(item.prices.retail * (100 - item.prices.magento)) : 0;
        let discountPercentage = item.discounts.magento ? 1 - (item.discounts.magento / 100) : 1
        if (item.prices.magento === 0) item.prices.magento = item.prices.retail
        item.prices.magentoSpecial = discountPercentage === 1
            ? item.prices.retail
            : (roundToNearest(item.prices.retail * discountPercentage))
        item.channelPrices.magento.updateRequired = item.channelPrices.magento.price !== item.prices.magento
    }

    if (!item.prices.magento) { // ---------------------- redundant? -----------------------
        item.marginData.magento.profit = 0 
        return
    } else if (!item.prices.magentoSpecial || item.prices.magentoSpecial === 0) {
        item.marginData.magento.fees = Fees.calc('magento', item.prices.magento)
        item.marginData.magento.salesVAT = item.prices.magento - (item.prices.magento / Fees.VAT());
        item.marginData.magento.profit = item.prices.magento < 25
            ? item.prices.magento - (
                item.prices.purchase +
                item.marginData.magento.fees +
                item.marginData.magento.salesVAT
            )
            : item.prices.magento - (
                item.prices.purchase +
                item.marginData.postage +
                item.marginData.packaging +
                item.marginData.magento.fees +
                item.marginData.magento.salesVAT
            )

        return

    } else {
            item.marginData.magento.fees = Fees.calc('magento', item.prices.magentoSpecial)
            item.marginData.magento.salesVAT = item.prices.magentoSpecial - (item.prices.magentoSpecial / Fees.VAT());
            item.marginData.magento.profit = item.prices.magentoSpecial < 25
            ? item.prices.magentoSpecial - (
                item.prices.purchase +
                item.marginData.magento.fees +
                item.marginData.magento.salesVAT
            )
            : item.prices.magentoSpecial - (
                item.prices.purchase +
                item.marginData.postage +
                item.marginData.packaging +
                item.marginData.magento.fees +
                item.marginData.magento.salesVAT
            )

        return
    }
}

const getShopListingCosts = async (item: sbt.Item, Fees: FeesClass) => {

    let discountPercentage = item.discounts.shop ? 1 - (item.discounts.shop / 100) : 1

    if (item.prices.retail) {
        item.prices.shop = discountPercentage === 1
            ? item.prices.retail
            : roundToNearest(item.prices.retail * discountPercentage)
    } else if (item.prices.magento) {
        item.prices.shop = discountPercentage === 1
            ? item.prices.magento
            : roundToNearest(item.prices.magento * discountPercentage)
    } else {
        item.prices.shop = 0;
        item.marginData.shop.profit = 0;
        return
    }

    item.marginData.shop.fees = Fees.calc('shop', item.prices.shop)
    item.marginData.shop.salesVAT = item.prices.shop - (item.prices.shop / Fees.VAT());

    item.marginData.shop.profit = item.prices.shop - (
        item.prices.purchase +
        item.marginData.shop.fees +
        item.marginData.shop.salesVAT
    )
    return
}
const getLastYearChannelProfits = async (item: sbt.Item) => {

    try {
        let year = ((new Date().getFullYear()) - 1)
        item.marginData.totalProfitLastYear = 0;

        for (let data of item.channelData) {
            if (data.year !== year) continue;

            let channel = data.source.toLowerCase()

            if (channel !== "amazon" &&
                channel !== "ebay" &&
                channel !== "magento" &&
                channel !== "shop") continue;

            item.marginData[channel].profitLastYear = data.quantity * item.marginData[channel].profitLastYear
            item.marginData.totalProfitLastYear += item.marginData[channel].profitLastYear
        }

    } catch(e) {
        console.log(item.SKU, e)
    }
    return
}

// converts a number to the nearest 0.05 or 0.99
const roundToNearest = (num: number):number => {

    let rounded = Math.round(num)
    let decimal = rounded % 100
    let whole = rounded - decimal

    let decimalRound = whole < 500
        ? (Math.ceil(decimal / 100 * 20) / 20) * 100
        : (Math.ceil(decimal / 100 * 4) / 4) * 100

    if (decimalRound === 0) return whole + decimalRound - 1
    if (decimalRound > 90) return whole + 99

    return Math.round(whole + decimalRound)
}