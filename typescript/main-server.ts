import {ping} from "./modules/mongo-interface";
import config = require('./config.json')
import * as HeartBeat from "./modules/heartbeat";
import path from 'path'
import express from 'express'
import http from 'http'


const app = express();
app.use("/images", express.static(path.join(__dirname, "./images")));
app.use("/brand-label-images", express.static(path.join(__dirname, "./brand-label-images")));
app.disable('x-powered-by')

http.createServer(app).listen(4000, async () => {
    console.log(`HTTP server listening`)
    await startSever()
    console.log(`Server started`)
});

const startSever = async () => {
    console.log("Server starting")

    // express text parser maximums (to allow handling of large JSON text strings)
    app.use(express.json({limit: '5mb'}));
    app.use(express.urlencoded({limit: '5mb', extended: true}));

    const allowed = ["192.168.1.200:4000", "192.168.1.120:4000", "localhost:4000"];
    app.use((req, res, next) => {
        allowed.includes(req.headers.host || "") ? next() : res.status(403).send("Forbidden")
    })


    //CORS filtering
    app.use(function (req, res, next) {
        if (req.headers.origin) { res.setHeader('Access-Control-Allow-Origin', req.headers.origin) }
        res.header("Access-Control-Allow-Credentials", "true")
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, authorization, token");
        next();
    });

    app.use((req, res, next) => {
        let token = req.headers.token?.toString() as "" | undefined
        token && config.tokens[token] ? next() : res.sendStatus(403)
    })

    console.log("Mongo Ping: ", await ping())

    // System ping
    app.post('/Ping', async (req, res) => {
        res.send(await ping())
    });

    // Heartbeat
    await HeartBeat.init()

}