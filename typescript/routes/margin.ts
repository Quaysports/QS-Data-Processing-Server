import * as express from 'express'
import {postToWorker} from "../modules/worker/worker-factory";
import {removeOverrides, unHideAll} from "../modules/routes/margin";
import {Fees} from "../modules/fees";
import {Packaging} from "../modules/packaging";
import {Postage} from "../modules/postage";
import ProcessMargins from "../modules/margin-calculation";


const marginRoutes = express.Router()

marginRoutes.post('/Update', async (req, res) => {
    let data = req.body?.SKU ? {skus: `'${req.body.SKU}'`} : {}
    let result = await postToWorker("update",
        {type: "channelPrices", data: data, msg: "", reqId: "", id: new Date().getTime().toString()}
    )
    res.send(result.data ? result.data : {status: 'done'})
})
marginRoutes.post('/UnHideAll', async (req, res) => {
    await unHideAll()
    res.end()
})

marginRoutes.post('/RemoveOverrides', async (req, res) => {
    await removeOverrides()
    res.end()
})

marginRoutes.post('/TestItem', async (req, res) => {
    /* Requires obj in req body:
    * {
    *   postage:1
    *   packaging:1,
    *   prices:1
    * }
     */
    let fees = new Fees()
    await fees.initialize()

    let packaging = new Packaging()
    await packaging.initialize()

    let postage = new Postage()
    await postage.initialize()

    await ProcessMargins(req.body, fees, packaging, postage)
    res.send(req.body)
})

export default marginRoutes