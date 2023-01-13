import fs from "fs";
import {uploadImages} from "../modules/routes/items";
import express = require('express')

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

export = router