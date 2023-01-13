import Auth from "../linnworks/auth";
import {getLinnQuery} from "../linnworks/api";

export default async function UpdateSuppliers(
    merge = (new Map<string, sbt.Item>()), skus?:string
){

    await Auth(true)
    console.log("querying supplier data!")
    console.log(new Date())

    interface SQLQuery {SKU:string, supplier:string, default:string}


    let query = `Select si.ItemNumber as 'SKU', s.SupplierName as 'supplier',  isup.IsDefault as 'default'
                 FROM StockItem si
                          INNER JOIN ItemSupplier isup ON si.pkStockItemId = isup.fkStockItemId
                          INNER JOIN Supplier s ON isup.fkSupplierId = s.pkSupplierID
                 WHERE si.bLogicalDelete = 0
                     ${skus ? "AND si.ItemNumber IN (" + skus + ")" : ""}`

    let linnData = (await getLinnQuery<SQLQuery>(query)).Results

    if (linnData) {
        for (let item of linnData) {
            let mergeItem = merge.get(item.SKU)
            if(!mergeItem) continue

            if(item.default === "True") mergeItem.supplier = item.supplier
            if(!mergeItem.suppliers.includes(item.supplier)) mergeItem.suppliers.push(item.supplier)
        }
    }

    return merge
}