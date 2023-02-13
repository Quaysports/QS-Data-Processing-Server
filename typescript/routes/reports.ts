import express from 'express'
import {postToWorker} from "../modules/worker/worker-factory";

const reportsRoutes = express.Router()
reportsRoutes.post('/Online-Sales', async (req, res) => {
    let result = await postToWorker("reports",
        {type: "online-sales", data: {}, msg: "", reqId: "", id: new Date().getTime().toString()}
    )
    res.send(result.data ? result.data : {status: 'done'})
})
export default reportsRoutes