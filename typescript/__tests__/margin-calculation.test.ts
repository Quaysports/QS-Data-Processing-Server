import {Postage, PostageData} from "../modules/postage";
import {Fees, FeesData} from "../modules/fees";
import {Packaging, PackagingData} from "../modules/packaging";
import {itemTemplate} from "../__mocks__/item-template";
import ProcessMargins from "../modules/margin-calculation";

const postageData: PostageData[] = [
    {
        id: "1",
        format: "test",
        vendor: "test",
        cost: 200,
        tag: ""
    },
    {
        id:"30823674-1131-4087-a2d0-c50fe871548e",
        format: "prime",
        vendor: "prime",
        cost: 300,
        tag: ""
    }
]
const postage = new Postage(postageData)

const feesData: FeesData = {
    VAT: 20,
    flat: {amazon: 0, ebay: 30, magento: 30, shop: 0},
    lastUpdate: "",
    listing: {amazon: 1550, ebay: 1090, magento: 290, shop: 175},
    subscription: {amazon: 1, ebay: 2, magento: 10, shop: 0},
    vatApplicable: {amazon: false, ebay: false, magento: false, shop: false}
}
const fees = new Fees(feesData)

const packagingData: PackagingData[] = [
    {
        _id: {$oid: ""}, id: "1", linkedSkus: [], name: "", price: 10, type: ""
    }
]
const packaging = new Packaging(packagingData)

let item:sbt.Item
beforeEach(() => {
    item = {
        ...itemTemplate(),
        postage: {id: "1", modifier: "", price: 0},
        packaging: {editable: false, group: "1", items: [], lock: false},
        prices: {retail: 1000, amazon: 1500, ebay: 1500, magento: 1300, purchase: 100, shop: 1200},
    }
})

describe("getPostageAndPackaging", () => {
    test("postage and packaging return default if not set", async () => {
        item.postage.id = ""
        item.packaging.group = ""
        await ProcessMargins(item, fees, packaging, postage)
        expect(item.marginData.postage).toBe(0)
        expect(item.marginData.packaging).toBe(10)
    })

    test("postage and packaging return correct values", async () => {

        await ProcessMargins(item, fees, packaging, postage)
        expect(item.marginData.postage).toBe(200)
        expect(item.marginData.packaging).toBe(10)
    })

    test("post modifier returns correct values", async () => {
        item.postage.modifier = "100"
        await ProcessMargins(item, fees, packaging, postage)
        expect(item.marginData.postage).toBe(300)

        item.postage.modifier = "x2"
        await ProcessMargins(item, fees, packaging, postage)
        expect(item.marginData.postage).toBe(400)
    })
})
describe("getAmazonListingCosts", () => {
    test("amazon listing costs return 0 if no price", async () => {
        item.prices.amazon = 0
        await ProcessMargins(item, fees, packaging, postage)
        expect(item.marginData.amazon.profit).toBe(0)
        expect(item.marginData.amazon.primeProfit).toBe(0)
        expect(item.marginData.amazon.fees).toBe(0)
        expect(item.marginData.amazon.salesVAT).toBe(0)
    })

    test("sets amazon price to retail if no amazon price", async () => {
        item.prices.amazon = 0
        item.tags.push("domestic")
        await ProcessMargins(item, fees, packaging, postage)
        expect(item.marginData.amazon.profit).toBe(367.33333333333337)
    })

    test("amazon listing costs return correct values", async () => {
        await ProcessMargins(item, fees, packaging, postage)
        expect(item.marginData.amazon.profit).toBe(706.5)
        expect(item.marginData.amazon.primeProfit).toBe(606.5)
        expect(item.marginData.amazon.fees).toBe(233.5)
        expect(item.marginData.amazon.salesVAT).toBe(250)
    })
})

describe("getEbayListingCosts", () => {
    test("ebay listing costs return 0 if no price", async () => {
        item.prices.ebay = 0
        await ProcessMargins(item, fees, packaging, postage)
        expect(item.marginData.ebay.profit).toBe(0)
        expect(item.marginData.ebay.fees).toBe(0)
        expect(item.marginData.ebay.salesVAT).toBe(0)
    })

    test("sets ebay price to retail if no ebay price", async () => {
        item.prices.ebay = 0
        item.tags.push("domestic")
        await ProcessMargins(item, fees, packaging, postage)
        expect(item.marginData.ebay.profit).toBe(382.33333333333337)
    })

    test("ebay listing costs return correct values", async () => {
        await ProcessMargins(item, fees, packaging, postage)
        expect(item.marginData.ebay.profit).toBe(744.5)
        expect(item.marginData.ebay.fees).toBe(195.5)
        expect(item.marginData.ebay.salesVAT).toBe(250)
    })
})

describe("getMagentoListingCosts", () => {
    test("magento listing costs return 0 if no price", async () => {
        item.prices.magento = 0
        await ProcessMargins(item, fees, packaging, postage)
        expect(item.marginData.magento.profit).toBe(0)
        expect(item.marginData.magento.fees).toBe(0)
        expect(item.marginData.magento.salesVAT).toBe(0)
    })

    test("sets magento price to retail if domestic and auto adds 5% discount", async () => {
        item.tags.push("domestic")
        await ProcessMargins(item, fees, packaging, postage)
        expect(item.marginData.magento.profit).toBe(414.1166666666668)
    })

    test("correctly calculates discount if greater than 0", async()=>{
        item.tags.push("domestic")
        item.discounts.magento = 10
        await ProcessMargins(item, fees, packaging, postage)
        expect(item.marginData.magento.profit).toBe(373.0956666666667)
    })

    test("magento listing costs return correct values", async () => {
        await ProcessMargins(item, fees, packaging, postage)
        expect(item.marginData.magento.profit).toBe(695.6333333333334)
        expect(item.marginData.magento.fees).toBe(77.7)
        expect(item.marginData.magento.salesVAT).toBe(216.66666666666652)
    })
})

describe("getShopListingCosts", () => {
    test("correctly sets shop price to retail", async () => {
        await ProcessMargins(item, fees, packaging, postage)
        expect(item.marginData.shop.profit).toBe(715.8333333333334)
        expect(item.prices.shop).toBe(1000)
    })
    test("correctly sets shop price to magento if no retail", async () => {
        item.prices.retail = 0
        await ProcessMargins(item, fees, packaging, postage)
        expect(item.marginData.shop.profit).toBe(960.5833333333335)
        expect(item.prices.shop).toBe(1300)
    })
    test("correctly sets prices to 0 if no retail or magento price", async () => {
        item.prices.retail = 0
        item.prices.magento = 0
        await ProcessMargins(item, fees, packaging, postage)
        expect(item.marginData.shop.profit).toBe(0)
        expect(item.prices.shop).toBe(0)
    })
    test("correctly calculates shop margins", async () => {
        await ProcessMargins(item, fees, packaging, postage)
        expect(item.marginData.shop.profit).toBe(715.8333333333334)
        expect(item.marginData.shop.fees).toBe(17.5)
        expect(item.marginData.shop.salesVAT).toBe(166.66666666666663)
    })
})