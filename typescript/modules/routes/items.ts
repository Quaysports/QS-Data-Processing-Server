import fs from "fs";
import sharp from "sharp";
import {findDistinct, findOne, setData} from "../mongo-interface";
import {updateLinnItem} from "../linnworks/api";
import path from "path";

interface DbImage extends Pick<sbt.Item, "_id" | "SKU"> {
    images: {
        [key: string]: {}
    }
}

const dbUpdateImage = async (item: DbImage) => {
    if (item._id !== undefined) delete item._id

    let result = await findOne<sbt.Item>("New-Items", {SKU: item.SKU}, {images: 1})
    if (result) {
        await setData("New-Items", {SKU: item.SKU}, {...result, images:{...result.images, ...item.images}})
        return {status:"done"}
    } else {
        return {status:"not found"}
    }
}

export const getMainItemImage = async (sku:string) => {

    console.log("image sku: " + sku)

    const item = await findOne<sbt.Item>("New-Items", {SKU: sku}, {images: 1})
    if (!item?.images?.main) return

    let path = item.images.main.link ? `/images/${item.images.main.link}/` : `/images/${sku}/`
    return path + item.images.main.filename

}

export const getItemForStockLookup = async (sku:string) => {
    return await findOne<sbt.Item>("New-Items", {SKU: sku}, {title: 1, SKU: 1, compositeItems:1})
}

export const getSKUListForStockLookup = async () => {
    return await findDistinct("New-Items", "SKU", {isListingVariation: false})
}

export async function uploadImages(file: { _id: string, SKU: string, id: string, filename: string, image: string, publicFilename?: string }) {

    const makeImagesFolder = async () => {
        if (!fs.existsSync('./images')) await fs.promises.mkdir("./images")
        return './images'
    }

    const makeSkuFolder = async (root: string) => {
        if (!fs.existsSync(`${root}/${file.SKU.replaceAll("/", "-")}`)) {
            await fs.promises.mkdir(`${root}/${file.SKU.replaceAll("/", "-")}`)
        }
        return `${root}/${file.SKU.replaceAll("/", "-")}`
    }

    function decodeBase64Image(dataString: string): { type: string | null, data: Buffer | null, error: Error | null } {
        let matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

        if (!matches || matches.length !== 3) return {type: null, data: null, error: new Error('Invalid input string')};

        return {type: matches[1], data: Buffer.from(matches[2], 'base64'), error: null};
    }

    //check for existing files
    const root = await makeImagesFolder()
    const imageFolderPath  = await makeSkuFolder(root)
    let dbImage: DbImage = {
        _id: file._id,
        SKU: file.SKU,
        images: {
            [file.id as "main"]: {
                filename: file.filename,
                ...(file.id === "main" && file.publicFilename && {publicFilename: file.publicFilename}),
                id: "",
                link: "",
                url:""
            }
        }
    }

    let image = decodeBase64Image(file.image)

    if(image.data === null){
        console.error("No image data")
        return
    }

    if (image.error) {
        console.error(image.error)
        return
    }

    let imageConversion = await sharp(image.data).jpeg().resize(2048 , 2048, {fit:"contain", background:{r:255,g:255,b:255}}).toBuffer();

    try {
        const filesInSkuFolder = await fs.promises.readdir(imageFolderPath); // Use fs.promises for async readdir
        console.log(imageFolderPath + " found!")

        for (let foundFile of filesInSkuFolder) {
            if (foundFile.split(".")[0] === file.filename.split(".")[0]) {
                await fs.promises.unlink(path.join(imageFolderPath, foundFile)); // Use fs.promises.unlink for async
            }
        }
        await fs.promises.writeFile(path.join(imageFolderPath, file.filename), imageConversion); // Use fs.promises.writeFile for async

        return await dbUpdateImage(dbImage); // <-- Call dbUpdateImage after file operations are done
    } catch (err: any) {
        // Handle cases where directory might not exist (though makeSkuFolder should prevent this)
        // or other file system errors
        if (err.code === 'ENOENT') {
            // Directory didn't exist when readdir was called.
            // This case should ideally not happen if makeSkuFolder worked.
            // If it does, you'd write the file directly.
            await fs.promises.writeFile(path.join(imageFolderPath, file.filename), imageConversion);
            return await dbUpdateImage(dbImage);
        } else {
            console.error("Error during file operations in uploadImages:", err);
            throw new Error(`File system operation failed: ${err.message}`); // Re-throw for route handler
        }
    }
}

export const deleteImage = async (id:keyof sbt.Item["images"], item:sbt.Item) => {
    console.log("id:", id)
    let files:string[] = []

    try {
        files = fs.readdirSync(`./images/${item.SKU}/`)
    } catch (e) {
        console.log({status: "No image or directory found"})
    }

    if (files.indexOf(item.images[id].filename) !== -1) {
        if (item.images[id].link === "") fs.unlinkSync(`./images/${item.SKU}/${item.images[id].filename}`)
    }

    const inventoryItemImages= {[item.linnId]: [item.images[id].url]}

    console.log(inventoryItemImages)
    let res = await updateLinnItem('/api/Inventory/DeleteImagesFromInventoryItem', `inventoryItemImages=${JSON.stringify(inventoryItemImages)}`)
    console.log(res)
    if(item._id) delete item._id
    const result = await setData("New-Items", {SKU: item.SKU}, {
        ...item,
        images:{
            ...item.images,
            [id]: {filename: "", id: "", link: "", url:""}
        }
    })

    if (result && result.modifiedCount === 0) return {status: "No image found"}

    return {status: "Deleted"}
}