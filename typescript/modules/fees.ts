import {findOne, setData} from "./mongo-interface";

interface FeesData {
    _id?: { $oid: string };
    listing: Channels;
    flat: Channels
    vatApplicable: VatApplicable
    VAT: number;
    lastUpdate: string;
    subscription: Channels
}

interface Channels {
    shop: string;
    magento: string;
    ebay: string;
    amazon: string
}

interface VatApplicable {
    shop: boolean;
    magento: boolean;
    ebay: boolean;
    amazon: boolean
}

export const get = async () => {
    let result = await findOne<FeesData>("New-Fees")
    return result!
}

export const update = async (data: FeesData) => {
    let query = {_id: data._id}
    delete data._id
    return await setData("New-Fees", query, data)
}

export interface FeesClass {

    initialize: () => Promise<void>;
    calc(id: "amazon" | "ebay" | "magento" | "shop", price: number): number;

    VAT(): number;
}

export class Fees implements FeesClass {

    async initialize() {
        await get().then((data) => this.fd = data)
    }

    private fd: FeesData | undefined;

    calc(id: "amazon" | "ebay" | "magento" | "shop", price: number) {
        if (!this.fd) return 0
        let per = parseFloat(this.fd.listing[id]) > 0 ? price * (parseFloat(this.fd.listing[id]) / 100) : 0;
        let flat = parseFloat(this.fd.flat[id])
        let sub = parseFloat(this.fd.subscription[id])
        return per + flat + sub;
    }

    VAT() {
        if (!this.fd?.VAT) return 1
        return (100 + (this.fd.VAT)) / 100
    }
}