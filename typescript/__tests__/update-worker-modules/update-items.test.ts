import {SQLQuery} from "../../modules/update-worker-modules/update-items";
import * as source from "../../modules/update-worker-modules/update-items";
import {itemTemplate} from "../../__mocks__/item-template";

jest.mock("../../modules/linnworks/auth", () => ({
    __esModule: true,
    ...jest.requireActual("../../modules/linnworks/auth"),
    default: jest.fn()
}))

let mockLinnData: SQLQuery[]
beforeEach(() => {
    mockLinnData = [
        {
            EAN: "",
            SKU: "",
            compositePurchasePrice: "",
            compositeQuantity: "",
            compositeSKU: "",
            compositeTitle: "",
            compositeWeight: "",
            epName: "",
            epType: "",
            epValue: "",
            isComposite: "",
            isListingVariation: "",
            linnId: "",
            packagingGroup: "",
            pkRowId: "",
            purchasePrice: "",
            retailPrice: "",
            title: "",
            weight: ""
        },
        {
            EAN: "",
            SKU: "",
            compositePurchasePrice: "",
            compositeQuantity: "",
            compositeSKU: "",
            compositeTitle: "",
            compositeWeight: "",
            epName: "",
            epType: "",
            epValue: "",
            isComposite: "",
            isListingVariation: "",
            linnId: "",
            packagingGroup: "",
            pkRowId: "",
            purchasePrice: "",
            retailPrice: "",
            title: "",
            weight: ""
        },
        {
            EAN: "",
            SKU: "",
            compositePurchasePrice: "",
            compositeQuantity: "",
            compositeSKU: "",
            compositeTitle: "",
            compositeWeight: "",
            epName: "",
            epType: "",
            epValue: "",
            isComposite: "",
            isListingVariation: "",
            linnId: "",
            packagingGroup: "",
            pkRowId: "",
            purchasePrice: "",
            retailPrice: "",
            title: "",
            weight: ""
        },
        {
            EAN: "",
            SKU: "",
            compositePurchasePrice: "",
            compositeQuantity: "",
            compositeSKU: "",
            compositeTitle: "",
            compositeWeight: "",
            epName: "",
            epType: "",
            epValue: "",
            isComposite: "",
            isListingVariation: "",
            linnId: "",
            packagingGroup: "",
            pkRowId: "",
            purchasePrice: "",
            retailPrice: "",
            title: "",
            weight: ""
        },
    ]
})

const linnQueryMock = jest.fn()
jest.mock("../../modules/linnworks/api", () => ({
    getLinnQuery: (args: string) => {
        linnQueryMock(args)
        return {Results: mockLinnData}
    }
}))

let mockItemsFromDBReturn = new Map([["123", {...itemTemplate(), linnId: "123"}]])

describe("Update Items", () => {
    test("Linnworks auth gets called", async () => {
        jest.spyOn(source, "getItemsFromDB").mockReturnValue(Promise.resolve(structuredClone(mockItemsFromDBReturn)))
        await source.default()
        expect(linnQueryMock).toBeCalled()
    })
})