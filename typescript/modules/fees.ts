import {findOne, setData} from "./mongo-interface";

export interface FeesData {
    _id?: { $oid: string };
    listing: Channels;
    flat: Channels
    vatApplicable: VatApplicable
    VAT: number;
    lastUpdate: string;
    subscription: Channels
}

interface Channels {
    shop: number;
    magento: number;
    ebay: number;
    amazon: number;
    onbuy: number
}

interface VatApplicable {
    shop: boolean;
    magento: boolean;
    ebay: boolean;
    amazon: boolean;
    onbuy: boolean;
}

export const get = async () => {
    try {
        let result = await findOne<FeesData>("New-Fees");
        return result!;
    } catch (error) {
        console.error('Error fetching data in get function:', error);
        throw error; // Re-throwing the error to propagate it to the caller
    }
}

export const update = async (data: FeesData) => {
    try {
        let query = { _id: data._id };
        delete data._id;
        return await setData("New-Fees", query, data);
    } catch (error) {
        console.error('Error updating data in update function:', error);
        throw error; // Re-throwing the error to propagate it to the caller
    }
}

export interface FeesClass {

    initialize: () => Promise<void>;
    calc(id: "amazon" | "ebay" | "magento" | "onbuy" | "shop", price: number): number;

    VAT(): number;
}

export class Fees implements FeesClass {

    constructor(fees: FeesData | undefined  = undefined) {
        this.fd = fees
    }

    async initialize() {
        try {
            const data = await get();
            this.fd = data;
        } catch (error) {
            console.error('Error initializing Fees:', error);
            throw error; // Re-throwing the error to propagate it to the caller
        }
    }

    private fd: FeesData | undefined;

    calc(id: "amazon" | "ebay" | "magento" | "onbuy" | "shop", price: number) {
        if (!this.fd) return 0
        let per = this.fd.listing[id] > 0 ? price * (this.fd.listing[id] / 100) / 100 : 0;
        let flat = this.fd.flat[id]
        let sub = this.fd.subscription[id]
        return per + flat + sub;
    }

    VAT() {
        if (!this.fd?.VAT) return 1
        return (100 + (this.fd.VAT)) / 100
    }
}