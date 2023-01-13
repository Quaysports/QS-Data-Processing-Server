import fs from "fs";
import {uploadImages} from "../modules/routes/items";
import express = require('express')
import {postToWorker} from "../modules/worker/worker-factory";

const router = express.Router()
router.post('/GetBrandLabelImages', async (req, res) => {
    const data = fs.readdirSync("./brand-label-images")
    res.send(data || [])
})

router.post('/UploadImages', async (req, res) => {
    /*
    * Req body obj: {_id:mongodb id, SKU:item.SKU, id:db image id, filename: index, image: image base64}
     */
    res.send(await uploadImages(req.body))
})

router.post('/UpdateAll', async (req, res) => {
    await postToWorker("update",
        {msg: "", reqId: "", type: "updateAll", data:{}, id: new Date().getTime().toString()}
    )
    res.send({ status: 'done' })
})

router.post('/UpdateLinnworksChannelPrices', async (req, res) => {
    await postToWorker("update",
        { type: "updateLinnChannelPrices", msg: "", reqId: "", data: { items:req.body.items }, id: new Date().getTime().toString() }
    )
    res.send({ status: 'done' })
})

export = router