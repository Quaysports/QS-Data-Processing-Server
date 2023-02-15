import GetLinnworksChannelPrices, {SQLQuery} from "../../modules/update-worker-modules/get-linnworks-channel-prices";
import {itemTemplate} from "../../__mocks__/item-template";

let mockLinnData: SQLQuery[]
beforeEach(() => {
    mockLinnData = [
        {
            ItemNumber: "123",
            Price: "20.00",
            Source: "amazon",
            SubSource: "amazon-sub-source",
            linnId: "123",
            pkRowId: "amazon-pkRowId",
            UpdateStatus: "1"
        },
        {
            ItemNumber: "123",
            Price: "15.00",
            Source: "ebay",
            SubSource: "ebay-sub-source",
            linnId: "123",
            pkRowId: "ebay-pkRowId",
            UpdateStatus: "2"
        },
        {
            ItemNumber: "123",
            Price: "12.50",
            Source: "magento",
            SubSource: "magento-sub-source",
            linnId: "123",
            pkRowId: "mag-pkRowId",
            UpdateStatus: "3"
        },
    ]
})
jest.mock("../../modules/linnworks/auth", () => ({
    __esModule: true,
    ...jest.requireActual("../../modules/linnworks/auth"),
    default: jest.fn()
}))

const linnQueryMock = jest.fn()
jest.mock("../../modules/linnworks/api", () => ({
    getLinnQuery: (args:string) => {
        linnQueryMock(args)
        return {Results: mockLinnData}
    }
}))

let mockItemsFromDBReturn = new Map([["123", {...itemTemplate(), linnId: "123"}]])
jest.mock("../../modules/update-worker-modules/update-items", () => ({
    getItemsFromDB: () => {
        return structuredClone(mockItemsFromDBReturn)
    }
}))

describe("getLinnworksChannelPrices", () => {

    test("Linnworks auth gets called", async () => {
        await GetLinnworksChannelPrices()
        expect(require("../../modules/linnworks/auth").default).toBeCalled()
    })

    test("Linnworks query gets called without sku list", async () => {
        await GetLinnworksChannelPrices()
        expect(linnQueryMock).not.toHaveBeenCalledWith(expect.stringContaining("si.ItemNumber IN"))
    })

    test("Linnworks query gets called with sku list", async () => {
        await GetLinnworksChannelPrices(undefined, "123,456")
        expect(linnQueryMock).toHaveBeenCalledWith(expect.stringContaining("si.ItemNumber IN (123,456)"))
    })

    //test that empty merge is returned if no Linnworks data is returned
    test("Empty merge is returned if no Linnworks data is returned and an empty map is provided", async () => {
        mockLinnData = []
        let merge = await GetLinnworksChannelPrices(new Map())
        expect(merge.size).toBe(0)
    })

    test("Unmodified merge is returned is no Linnworks data is returned", async () => {
        mockLinnData = []
        let merge = await GetLinnworksChannelPrices()
        expect(merge.get("123")?.channelPrices.amazon.price).toStrictEqual(mockItemsFromDBReturn.get("123")?.channelPrices.amazon.price)
    })

    test("Merge is updated with Linnworks data", async () => {
        let merge = await GetLinnworksChannelPrices()
        expect(merge.get("123")?.channelPrices.amazon.price).toStrictEqual(2000)
        expect(merge.get("123")?.channelPrices.ebay.price).toStrictEqual(1500)
        expect(merge.get("123")?.channelPrices.magento.price).toStrictEqual(1250)
    })
})