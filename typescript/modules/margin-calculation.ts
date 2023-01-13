import {FeesClass} from "./fees";
import {PackagingClass} from "./packaging";
import {PostageClass} from "./postage";

export default async function ProcessMargins (item: sbt.Item, Fees: FeesClass, Packaging:PackagingClass, Postage:PostageClass) {
    item.marginData = {
        amazonFees: 0,
        amazonPrimePostageCost: 0,
        amazonPrimeProfitAfterVat: 0,
        amazonProfitAfterVat: 0,
        amazonProfitLastYear: 0,
        amazonSalesVat: 0,
        ebayFees: 0,
        ebayProfitAfterVat: 0,
        ebayProfitLastYear: 0,
        ebaySalesVat: 0,
        magentoFees: 0,
        magentoProfitAfterVat: 0,
        magentoProfitLastYear: 0,
        magentoSalesVat: 0,
        packagingCost: 0,
        postageCost: 0,
        shopFees: 0,
        shopProfitAfterVat: 0,
        shopProfitLastYear: 0,
        shopSalesVat: 0,
        totalProfitLastYear: 0
    }

    await getPostageAndPackaging(item, Packaging, Postage)
    await getAmazonListingCosts(item, Fees);
    await getMagentoListingCosts(item, Fees);
    await getEbayListingCosts(item, Fees);
    await getShopListingCosts(item, Fees);
    await getLastYearChannelProfits(item);
    return
}

const getPostageAndPackaging = async (item: sbt.Item, Packaging:PackagingClass, Postage:PostageClass) => {

    let postage = await Postage.find(item.postage.id)
    if (!postage) postage = {POSTCOSTEXVAT: 0, POSTID: item.postage.id}
    item.marginData.postageCost = modifyPostVal(postage.POSTCOSTEXVAT, item.postage.modifier)

    let amazonPrimePostage = await Postage.find("30823674-1131-4087-a2d0-c50fe871548e")
    if (!amazonPrimePostage) amazonPrimePostage = {POSTCOSTEXVAT: 0, POSTID: "30823674-1131-4087-a2d0-c50fe871548e"}
    item.marginData.amazonPrimePostageCost = modifyPostVal(amazonPrimePostage!.POSTCOSTEXVAT, item.postage.modifier)

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
    item.marginData.packagingCost = packaging?.PRICE ? packaging.PRICE : 0.1
}

const getAmazonListingCosts = async (item: sbt.Item, Fees:FeesClass) => {

    if (item.tags.includes("domestic")) {
        if (!item.prices.amazon) item.prices.retail ? item.prices.amazon = item.prices.retail : 0;
        item.channelPrices.amazon.updateRequired = parseFloat(item.channelPrices.amazon.price) !== item.prices.amazon
    }

    if (!item.prices.amazon) {
        item.marginData.amazonProfitAfterVat = 0;
        return
    } else {
        item.marginData.amazonFees = Fees.calc('amazon', item.prices.amazon)
        item.marginData.amazonSalesVat = item.prices.amazon - (item.prices.amazon / Fees.VAT());

        item.marginData.amazonProfitAfterVat = item.prices.amazon - (
            item.prices.purchase +
            item.marginData.postageCost +
            item.marginData.packagingCost +
            item.marginData.amazonFees +
            item.marginData.amazonSalesVat
        )

        item.marginData.amazonPrimeProfitAfterVat = item.prices.amazon - (
            item.prices.purchase +
            item.marginData.amazonPrimePostageCost +
            item.marginData.packagingCost +
            item.marginData.amazonFees +
            item.marginData.amazonSalesVat
        )

        return
    }
}

const getEbayListingCosts = async (item: sbt.Item, Fees:FeesClass) => {

    if (item.tags.includes("domestic")) {
        if (!item.prices.ebay) item.prices.retail ? item.prices.ebay = item.prices.retail : 0;
        item.channelPrices.ebay.updateRequired = parseFloat(item.channelPrices.ebay.price) !== item.prices.ebay
    }

    if (!item.prices.ebay) {
        item.marginData.ebayProfitAfterVat = 0;
        return
    } else {
        item.marginData.ebayFees = Fees.calc('ebay', item.prices.ebay)
        item.marginData.ebaySalesVat = item.prices.ebay - (item.prices.ebay / Fees.VAT());
        item.marginData.ebayProfitAfterVat = item.prices.ebay - (
            item.prices.purchase +
            item.marginData.postageCost +
            item.marginData.packagingCost +
            item.marginData.ebayFees +
            item.marginData.ebaySalesVat
        )
        return
    }
}

const getMagentoListingCosts = async (item: sbt.Item, Fees:FeesClass) => {

    if (item.tags.includes("domestic")) {
        if (item.discounts.magento === 0) item.discounts.magento = 5
        let discountPercentage = item.discounts.magento ? 1 - (item.discounts.magento / 100) : 1
        item.prices.magento = discountPercentage === 1
            ? item.prices.retail
            : item.prices.retail ? ((Math.floor((item.prices.retail! * 100) * discountPercentage)) / 100) : 0;

        item.channelPrices.magento.updateRequired = parseFloat(item.channelPrices.magento.price) !== item.prices.magento
    }

    if (!item.prices.magento) {
        item.marginData.magentoProfitAfterVat = 0;
        return
    } else {
        item.marginData.magentoFees = Fees.calc('magento', item.prices.magento)
        item.marginData.magentoSalesVat = item.prices.magento - (item.prices.magento / Fees.VAT());
        item.marginData.magentoProfitAfterVat = item.prices.magento < 25
            ? item.prices.magento - (item.prices.purchase + item.marginData.magentoFees + item.marginData.magentoSalesVat)
            : item.prices.magento - (
                item.prices.purchase +
                item.marginData.postageCost +
                item.marginData.packagingCost +
                item.marginData.magentoFees +
                item.marginData.magentoSalesVat
            )

        return
    }
}

const getShopListingCosts = async (item: sbt.Item, Fees:FeesClass) => {

    let discountPercentage = item.discounts.shop ? 1 - (item.discounts.shop / 100) : 1

    if (item.prices.retail) {
        item.prices.shop = discountPercentage === 1
            ? item.prices.retail
            : ((Math.ceil((item.prices.retail * 100) * discountPercentage)) / 100)
    } else if (item.prices.magento) {
        item.prices.shop = discountPercentage === 1
            ? item.prices.magento
            : ((Math.ceil((Number(item.prices.magento) * 100) * discountPercentage)) / 100)
    } else {
        item.prices.shop = 0;
        item.marginData.shopProfitAfterVat = 0;
        return
    }

    item.marginData.shopFees = Fees.calc('shop', item.prices.shop)
    item.marginData.shopSalesVat = item.prices.shop - (item.prices.shop / Fees.VAT());

    item.marginData.shopProfitAfterVat = item.prices.shop - (
        item.prices.purchase! +
        item.marginData.shopFees +
        item.marginData.shopSalesVat
    )
    return
}

const getLastYearChannelProfits = async (item: sbt.Item) => {

    let year = ((new Date().getFullYear()) - 1)
    item.marginData.totalProfitLastYear = 0;

    for(let data of item.channelData){
        if(data.year !== year) continue;
        switch(data.source){
            case "AMAZON": {
                item.marginData.amazonProfitLastYear = data.quantity * item.marginData.amazonProfitAfterVat
                item.marginData.totalProfitLastYear += item.marginData.amazonProfitLastYear
                break
            }
            case "EBAY": {
                item.marginData.ebayProfitLastYear = data.quantity * item.marginData.ebayProfitAfterVat
                item.marginData.totalProfitLastYear += item.marginData.ebayProfitLastYear
                break
            }
            case "MAGENTO": {
                item.marginData.magentoProfitLastYear = data.quantity * item.marginData.magentoProfitAfterVat
                item.marginData.totalProfitLastYear += item.marginData.magentoProfitLastYear
                break
            }
            case "SHOP": {
                item.marginData.shopProfitLastYear = data.quantity * item.marginData.shopProfitAfterVat
                item.marginData.totalProfitLastYear += item.marginData.shopProfitLastYear
                break
            }
        }
    }

    return
}