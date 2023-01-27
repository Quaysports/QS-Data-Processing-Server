import {find, setData} from "./mongo-interface";
import {getPostalServices} from "./linnworks/api";

export interface PostageData {
    _id?: { $oid: string };
    format: string;
    id: string;
    vendor: string;
    cost: number;
    tag: string;
}

export interface PostageClass {

    initialize: () => Promise<void>;
    find: (id: string) => PostageData | undefined;
}

export const get = async () => {
    return await find<PostageData>("New-Postage")
}

export const update = async (data:PostageData) => {
    if (data._id !== undefined) delete data._id;
    await setData("New-Postage", {format: data.format}, data)
    return data
}

export const updateAll = async () => {
    console.log('Postage', 'Updating from Linnworks')
    const linnPostalServices = await getPostalServices()
    const postage = await get()

    for (let service of linnPostalServices) {
        if (service.hasMappedShippingService) {
            let existingService = postage?.find((p) => p.id === service.id)
            let linnData = {
                format: service.PostalServiceName,
                id: service.id,
                vendor: service.Vendor
            };

            let update = existingService ? {...existingService, ...linnData} : {...postageTemplate(), linnData};

            await setData("New-Postage", {format: update.format}, update)
        }
    }
    return
}
/*
export const remove = async (data:PostageData) => {
    if (data._id !== undefined) delete data._id
    await deleteOne("Postage", {POSTALFORMAT: data.POSTALFORMAT})
    return data
}
*/

export class Postage implements PostageClass {

    async initialize() {
        await get().then((data) => this.postage = data)
    }

    private postage: PostageData[] | undefined;

    find(id: string) {
        if (!this.postage) return undefined
        return this.postage.find((p) => p.id === id)
    }
}

function postageTemplate():PostageData{
    return {
        cost: 0, format: "", id: "", tag: "", vendor: ""
    }
}