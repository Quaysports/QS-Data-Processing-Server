import {SQLQuery} from "../../modules/update-worker-modules/update-channel-references";
import UpdateChannelReferences from "../../modules/update-worker-modules/update-channel-references";
import {itemTemplate} from "../../__mocks__/item-template";

jest.mock("../../modules/linnworks/auth", () => ({
    __esModule: true,
    ...jest.requireActual("../../modules/linnworks/auth"),
    default: jest.fn()
}))

let mockLinnData: SQLQuery[]
const linnQueryMock = jest.fn()
jest.mock("../../modules/linnworks/api", () => ({
    getLinnQuery: (args: string) => {
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

beforeEach(() => {
    jest.clearAllMocks()
    mockLinnData = [
        {
            channelReferenceId: "amazon-ref",
            channelSKU: "123",
            linnId: "123",
            source: "AMAZON",
            subSource: "amazon-sub-source"
        },
        {
            channelReferenceId: "ebay-ref",
            channelSKU: "123",
            linnId: "123",
            source: "EBAY",
            subSource: "ebay-sub-source"
        },
        {
            channelReferenceId: "magento-ref",
            channelSKU: "123",
            linnId: "123",
            source: "MAGENTO",
            subSource: "mag-sub-source"
        },
    ]
})

describe("updateChannelReferences", () => {
    test("Linnworks auth is called", async () => {
        await UpdateChannelReferences()
        expect(linnQueryMock).toBeCalled()
    })

    test("If empty merge is passed in then no items are updated", async () => {
        const result = await UpdateChannelReferences(new Map())
        expect(result).toEqual(new Map())
    })

    test("If no merge is passed in getItemsFromDB is called", async () => {
        await UpdateChannelReferences()
        expect(linnQueryMock).toBeCalled()
    })

    test("if skus are passed in getLinnQuery is called with the correct query", async () => {
        await UpdateChannelReferences(undefined,"123")
        expect(linnQueryMock).toBeCalledWith(expect.stringContaining("AND si.ItemNumber IN (123)"))
    })

    test("If no skus are passed in getLinnQuery is called with the correct query", async () => {
        await UpdateChannelReferences()
        expect(linnQueryMock).not.toBeCalledWith(expect.stringContaining("AND si.ItemNumber IN (123)"))
    })

    test("if getLinnQuery returns no results then no items are updated", async () => {
        mockLinnData = []
        const result = await UpdateChannelReferences()
        expect(result.get("123")).toEqual(mockItemsFromDBReturn.get("123"))
    })

    test("if getLinnQuery returns results then the items are updated", async () => {
        const result = await UpdateChannelReferences()
        for(let channel of mockLinnData) {
            for(let reference of result.get("123")!.channelReferenceData) {
                if(reference.source === channel.source.toLowerCase())
                    expect(reference.id).toEqual(channel.channelReferenceId)
            }
        }
    })
})