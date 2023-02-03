import fs from "fs";
const sharp = require('sharp');
import {findOne, setData} from "../mongo-interface";
import {updateLinnItem} from "../linnworks/api";

interface DbImage extends Pick<sbt.Item, "_id" | "SKU"> {
    images: {
        [key: string]: {}
    }
}

const dbUpdateImage = async (item: DbImage) => {
    if (item._id !== undefined) delete item._id

    let result = await findOne<sbt.Item>("New-Items", {SKU: item.SKU}, {images: 1})
    if (result) {
        await setData("New-Items", {SKU: item.SKU}, {...result, ...item})
        return {status:"done"}
    } else {
        return {status:"not found"}
    }
}

export async function uploadImages(file: { _id: string, SKU: string, id: string, filename: string, image: string }) {

    const makeImagesFolder = async () => {
        if (!fs.existsSync('./images')) await fs.mkdirSync("./images")
        return './images'
    }

    const makeSkuFolder = async (root: string) => {
        if (!fs.existsSync(`${root}/${file.SKU.replaceAll("/", "-")}`)) {
            await fs.mkdirSync(`${root}/${file.SKU.replaceAll("/", "-")}`)
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
    const path = await makeSkuFolder(root)
    let dbImage: DbImage = {
        _id: file._id,
        SKU: file.SKU,
        images: {
            [file.id as "main"]: {
                filename: file.filename,
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

    fs.readdir(path, function (err: Error | null, files: string[]) {
        console.log(path + " found!")
        if (!files) {
            fs.writeFile(`${path}/${file.filename}`, imageConversion, async () => {
                if (err) console.log(err)
                return await dbUpdateImage(dbImage)
            })
        } else {
            for (let foundFile of files) {
                if (foundFile.split(".")[0] === file.filename.split(".")[0]) {
                    fs.unlinkSync(`${path}/${foundFile}`)
                }
            }
            fs.writeFile(`${path}/${file.filename}`, imageConversion, async () => {
                if (err) console.log(err)
                return await dbUpdateImage(dbImage)
            })
        }
    })
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