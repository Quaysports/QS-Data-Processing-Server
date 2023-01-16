import {find, setData} from "./mongo-interface";
import {getPostalServices} from "./linnworks/api";

export interface PostageData {
    _id?: { $oid: string };
    POSTALFORMAT?: string;
    POSTID: string;
    VENDOR?: string;
    POSTCOSTEXVAT: number;
    SFORMAT?: string;
    LINNSHIPPING?: string;
    LASTUPDATE?: string;
}

export interface PostageClass {

    initialize: () => Promise<void>;
    find: (id: string) => PostageData | undefined;
}

export const get = async () => {
    return await find<PostageData>("Postage")
}

export const update = async (data:PostageData) => {
    if (data._id !== undefined) delete data._id;
    await setData("Postage", {POSTALFORMAT: data.POSTALFORMAT}, data)
    return data
}

export const updateAll = async () => {
    console.log('Postage', 'Updating from Linnworks')
    const linnPostalServices = await getPostalServices()
    for (let service of linnPostalServices) {
        if (service.hasMappedShippingService) {
            let postService = {
                POSTALFORMAT: service.PostalServiceName,
                POSTID: service.id,
                VENDOR: service.Vendor
            };
            await setData("Postage", {POSTALFORMAT: postService.POSTALFORMAT}, postService)
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
        return this.postage.find((p) => p.POSTID === id)
    }
}