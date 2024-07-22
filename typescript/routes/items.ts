import fs from "fs";
import {
    deleteImage,
    getMainItemImage,
    getItemForStockLookup,
    uploadImages,
    getSKUListForStockLookup
} from "../modules/routes/items";
import * as express from 'express';
import { postToWorker } from "../modules/worker/worker-factory";

const itemsRoutes = express.Router();

itemsRoutes.post('/StockLookup', async (req, res) => {
    try {
        const result = await getItemForStockLookup(req.body.query);
        res.send(result);
    } catch (error) {
        console.error('Error in StockLookup:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

itemsRoutes.post('/StockLookupSKUList', async (req, res) => {
    try {
        const result = await getSKUListForStockLookup();
        res.send(result);
    } catch (error) {
        console.error('Error in StockLookupSKUList:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

itemsRoutes.post('/GetItemImage', async (req, res) => {
    try {
        res.set('Content-Type', 'text/plain');
        const result = await getMainItemImage(req.body.query);
        res.send(result);
    } catch (error) {
        console.error('Error in GetItemImage:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

itemsRoutes.post('/GetBrandLabelImages', async (req, res) => {
    try {
        const data = fs.readdirSync("./brand-label-images");
        res.send(data || []);
    } catch (error) {
        console.error('Error in GetBrandLabelImages:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

itemsRoutes.post('/UploadImages', async (req, res) => {
    try {
        const result = await uploadImages(req.body);
        res.send(result);
    } catch (error) {
        console.error('Error in UploadImages:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

itemsRoutes.post('/UpdateAll', async (req, res) => {
    try {
        await postToWorker("update",
            { msg: "", reqId: "", type: "updateAll", data: {}, id: new Date().getTime().toString() }
        );
        res.send({ status: 'done' });
    } catch (error) {
        console.error('Error in UpdateAll:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

itemsRoutes.post('/UpdateItemStock', async (req, res) => {
    try {
        console.dir(req.body);
        await postToWorker(
            "update",
            { msg: "", reqId: "", type: "stockTotal", data: { skus: req.body.skuList, save: true }, id: new Date().getTime().toString() }
        );
        res.send({ status: 'done' });
    } catch (error) {
        console.error('Error in UpdateItemStock:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

itemsRoutes.post('/UpdateLinnworksChannelPrices', async (req, res) => {
    try {
        await postToWorker("update",
            {
                type: "updateLinnChannelPrices",
                msg: "",
                reqId: "",
                data: { items: req.body.items },
                id: new Date().getTime().toString()
            }
        );
        res.send({ status: 'done' });
    } catch (error) {
        console.error('Error in UpdateLinnworksChannelPrices:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

itemsRoutes.post('/DeleteImage', async (req, res) => {
    try {
        const result = await deleteImage(req.body.id, req.body.item);
        res.send(result);
    } catch (error) {
        console.error('Error in DeleteImage:', error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

export default itemsRoutes;
