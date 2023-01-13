import {find, setData} from "./mongo-interface";
import {getLinnQuery} from "./linnworks/api";

export interface PackagingData {
    _id?: { $oid: string };
    ID: string;
    LINKEDSKU: string[];
    NAME: string;
    TYPE: string;
    PRICE?: number;
}

export interface PackagingClass {

    initialize: () => Promise<void>;
    find: (id: string) => PackagingData | undefined;
}
export const get = async () => {
    return await find<PackagingData>("Packaging", {})
}

export const update = async (data: PackagingData) => {
    if (data._id) delete data._id
    return await setData("Packaging", {ID: data.ID}, data)
}

export const updateAll = async () => {
    console.log('Packaging', 'Updating from Linnworks')
    const linnData = await linnGet()
    for (let v of linnData) await setData("Packaging", {ID: v.ID}, v)
    return {status: 'done'}
}

export const linnGet = async () => {
    let packaging = await getLinnQuery<{ Category: string, ID: string, Type: string, SKU: string }>(
        `SELECT pg.PackageCategory   AS Category,
                pg.PackageCategoryID AS ID,
                pt.PackageTitle      AS Type,
                si.ItemNumber        AS SKU
         FROM PackageGroups pg
                  INNER JOIN PackageTypes pt ON pg.PackageCategoryID = pt.PackageGroupID
                  INNER JOIN StockItem si ON si.PackageGroup = pg.PackageCategoryID
         WHERE pg.bLogicalDelete = 'false'
           AND si.bLogicalDelete = 0
         ORDER BY pg.PackageCategory`
    )

    let data = packaging.Results
    let process = []
    for (let v in data) {
        let pos = process.map(item=>{return item.ID}).indexOf(data[v].ID)
        if (pos === -1) {
            process.push({
                ID: data[v].ID,
                NAME: data[v].Category,
                TYPE: data[v].Type,
                LINKEDSKU: [data[v].SKU]
            })
        } else {
            process[pos].LINKEDSKU.push(data[v].SKU)
            process[pos].LINKEDSKU.sort()
        }
    }
    return process
}
export class Packaging implements PackagingClass {

    async initialize() {
        await updateAll()
        await get().then((data) => this.packaging = data)
    }

    private packaging: PackagingData[] | undefined;

    find(id: string) {
        if (!this.packaging) return undefined
        return this.packaging.find((p) => p.ID === id)
    }
}