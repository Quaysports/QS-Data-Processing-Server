import {deleteOne, findOne, setData} from "./mongo-interface";
import {getPostalServices} from "./linnworks/api";

export interface PostalData {
    _id?: { $oid: string };
    POSTALFORMAT?: string;
    POSTID: string;
    VENDOR?: string;
    POSTCOSTEXVAT: number;
    SFORMAT?: string;
    LINNSHIPPING?: string;
    LASTUPDATE?: string;
}



export const get = async (id:string) => {
    return await findOne<PostalData>("Postage", {POSTID: id})
}

export const update = async (data:PostalData) => {
    if (data._id !== undefined) delete data._id;
    await setData("Postage", {POSTALFORMAT: data.POSTALFORMAT}, data)
    return data
}

export const updateAll = async () => {
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

export const remove = async (data:PostalData) => {
    if (data._id !== undefined) delete data._id
    await deleteOne("Postage", {POSTALFORMAT: data.POSTALFORMAT})
    return data
}