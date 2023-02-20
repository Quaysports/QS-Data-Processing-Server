import UpdateChannelData, {SQLQuery} from "../../modules/update-worker-modules/update-channel-data";
import {itemTemplate} from "../../__mocks__/item-template";
jest.mock("../../modules/linnworks/auth", () => ({
    __esModule: true,
    ...jest.requireActual("../../modules/linnworks/auth"),
    default: jest.fn()
}))

let mockLinnData: SQLQuery[]
beforeEach(() => {
    mockLinnData = [
        {linnId: "123", YEAR: 2020, SOURCE: "amazon", QTY: "1"},
        {linnId: "123", YEAR: 2020, SOURCE: "ebay", QTY: "2"},
        {linnId: "123", YEAR: 2020, SOURCE: "magento", QTY: "3"},
        {linnId: "123", YEAR: 2021, SOURCE: "amazon", QTY: "1"},
        {linnId: "123", YEAR: 2020, SOURCE: "ebay", QTY: "2"},
        {linnId: "123", YEAR: 2020, SOURCE: "magento", QTY: "3"},
    ]
})

const linnQueryMock = jest.fn()
jest.mock("../../modules/linnworks/api", () => ({
    getLinnQuery: (args: string) => {
        linnQueryMock(args)
        return {Results: mockLinnData}
    }
}))

describe("updateChannelData", () => {
    test("Linnworks auth gets called", async () => {
        await UpdateChannelData()
        expect(linnQueryMock).toBeCalled()
    })

    test("no merge and no Linnworks data returns an empty merge", async () => {
        mockLinnData = []
        const merge = await UpdateChannelData()
        expect(merge).toEqual(new Map())
    })

    test("merge without Linnworks data returns same merge", async () => {
        mockLinnData = []
        let merge = new Map([["123", {...itemTemplate()}]])
        const mergeResult = await UpdateChannelData(structuredClone(merge))
        expect(mergeResult.get("123")).toEqual(merge.get("123"))
    })

    test("merge with Linnworks data returns updated merged data", async () => {
        let merge = new Map([["123", {...itemTemplate()}]])
        const mergeResult = await UpdateChannelData(structuredClone(merge))
        let item = mergeResult.get("123")
        for(let result of mockLinnData){
            for(let data of item!.channelData){
                if(data.year === result.YEAR && data.source === result.SOURCE){
                    expect(data.quantity).toEqual(Number(result.QTY))
                }
            }
        }
    })
})