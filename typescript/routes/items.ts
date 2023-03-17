import fs from "fs";
import {deleteImage, getMainItemImage, getItemForStockLookup, uploadImages} from "../modules/routes/items";
import * as express from 'express'
import {postToWorker} from "../modules/worker/worker-factory";


const itemsRoutes = express.Router()

itemsRoutes.post('/StockLookup', async (req, res) => {
    const item = await getItemForStockLookup(req.body)
    res.send(item)
})
itemsRoutes.post('/GetItemImage', async (req, res) => {
    const imagePath = await getMainItemImage(req.body)
    res.set('Content-Type', 'text/plain')
    res.send(imagePath)
})
itemsRoutes.post('/GetBrandLabelImages', async (req, res) => {
    const data = fs.readdirSync("./brand-label-images")
    res.send(data || [])
})

itemsRoutes.post('/UploadImages', async (req, res) => {
    /*
    * Req body obj: {_id:mongodb id, SKU:item.SKU, id:db image id, filename: index, image: image base64}
     */
    res.send(await uploadImages(req.body))
})

itemsRoutes.post('/UpdateAll', async (req, res) => {
    await postToWorker("update",
        {msg: "", reqId: "", type: "updateAll", data: {}, id: new Date().getTime().toString()}
    )
    res.send({status: 'done'})
})

itemsRoutes.post('/UpdateLinnworksChannelPrices', async (req, res) => {
    await postToWorker("update",
        {
            type: "updateLinnChannelPrices",
            msg: "",
            reqId: "",
            data: {items: req.body.items},
            id: new Date().getTime().toString()
        }
    )
    res.send({status: 'done'})
})
itemsRoutes.post('/DeleteImage', async (req, res) => {
    res.send(await deleteImage(req.body.id, req.body.item))
})

export default itemsRoutes