import {find, setData} from "./mongo-interface";
import {getLinnQuery} from "./linnworks/api";

export interface PackagingData {
    _id?: { $oid: string };
    id: string;
    linkedSkus: string[];
    name: string;
    type: string;
    price: number;
}

export interface PackagingClass {

    initialize: () => Promise<void>;
    find: (id: string) => PackagingData | undefined;
}
export const get = async () => {
    return await find<PackagingData>("New-Packaging", {})
}

export const update = async (data: PackagingData) => {
    if (data._id) delete data._id
    return await setData("New-Packaging", {id: data.id}, data)
}

export const updateAll = async () => {
    console.log('Packaging', 'Updating from Linnworks')
    const linnData = await linnGet()
    for (let v of linnData) await setData("New-Packaging", {id: v.id}, v)
    return {status: 'done'}
}

export const linnGet = async () => {
    let packaging = await getLinnQuery<{ name: string, id: string, type: string, SKU: string }>(
        `SELECT pg.PackageCategory   AS name,
                pg.PackageCategoryID AS id,
                pt.PackageTitle      AS type,
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
        let pos = process.map(item=>{return item.id}).indexOf(data[v].id)
        if (pos === -1) {
            process.push({
                id: data[v].id,
                name: data[v].name,
                type: data[v].type,
                linkedSkus: [data[v].SKU]
            })
        } else {
            process[pos].linkedSkus.push(data[v].SKU)
            process[pos].linkedSkus.sort()
        }
    }
    return process
}
export class Packaging implements PackagingClass {

    constructor(packaging: PackagingData[] | undefined) {
        this.packaging = packaging
    }

    async initialize() {
        await get().then((data) => this.packaging = data)
    }

    private packaging: PackagingData[] | undefined;

    find(id: string) {
        if (!this.packaging) return undefined
        return this.packaging.find((p) => p.id === id)
    }
}