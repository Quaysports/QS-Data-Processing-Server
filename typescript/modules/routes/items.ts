import fs from "fs";
import {findOne, setData, unsetData} from "../mongo-interface";

interface DbImage extends Pick<sbt.Item, "_id" | "SKU"> {
    images: {
        [key: string]: {}
    }
}

const dbUpdateImage = async (item: DbImage) => {
    if (item._id !== undefined) delete item._id

    let result = await findOne<sbt.Item>("New-Items", {SKU: item.SKU}, {images: 1})
    if (result) {
        for (let i in item.images) {
            let key = i as keyof sbt.Item["images"]
            result.images[key] = {...result.images[key], ...item.images[i]}
        }
        await setData("New-Items", {SKU: item.SKU}, result)
        return result
    } else {
        return result
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
                link: ""
            }
        }
    }

    let image = decodeBase64Image(file.image)

    if (image.error) {
        console.error(image.error)
        return
    }

    fs.readdir(path, function (err: Error | null, files: string[]) {
        console.log(path + " found!")
        if (!files) {
            fs.writeFile(`${path}/${file.filename}`, image.data!, async () => {
                if (err) console.log(err)
                return await dbUpdateImage(dbImage)
            })
        } else {
            for (let foundFile of files) {
                if (foundFile.split(".")[0] === file.filename.split(".")[0]) {
                    fs.unlinkSync(`${path}/${foundFile}`)
                }
            }
            fs.writeFile(`${path}/${file.filename}`, image.data!, async () => {
                if (err) console.log(err)
                return await dbUpdateImage(dbImage)
            })
        }
    })
}
export const deleteImage = async (id:keyof sbt.Item["images"], item:sbt.Item) => {
    const result = await unsetData("New-Items", {SKU: item.SKU}, {["images." + id]: ""})
    console.log(result)
    if (result && result.modifiedCount === 0) return {status: "No image found"}

    const files = fs.readdirSync(`./images/${item.SKU}/`)
    console.log(files)
    if (files.indexOf(item.images[id].filename) !== -1) {
        console.log(item.images[id])
        console.log(item.images[id].link)
        if (item.images[id].link === "") fs.unlinkSync(`./images/${item.SKU}/${item.images[id].filename}`)
    }

    return {status: "Deleted"}
}