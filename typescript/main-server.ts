import {ping} from "./modules/mongo-interface";
import * as HeartBeat from "./modules/heartbeat";
import * as Orders from "./modules/orders/orders";
import itemRoutes from './routes/items';
import marginRoutes from './routes/margin';
import reportRoutes from './routes/reports';
import path from 'path'
import express from 'express'
import http from 'http'
const app = express();

http.createServer(app).listen(4000, async () => {
    console.log(`HTTP server listening`)
    await startSever()
    console.log(`Server started on: 4000`)

    // Heartbeat
    await HeartBeat.init()
    await Orders.init();
});

const startSever = async () => {
    console.log("Server starting")
    console.log(process.env.DBNAME)
    // Add this before any other middleware
    app.use((req, res, next) => {
        console.log("Incoming request:", {
            timestamp: new Date().toISOString(),
            host: req.headers.host,
            url: req.url,
            method: req.method,
            ip: req.ip
        });
        next();
    });
    // express text parser maximums (to allow handling of large JSON text strings)
    app.use(express.json({limit: '5mb'}));
    app.use(express.urlencoded({limit: '5mb', extended: true}));

    app.disable('x-powered-by')
    app.use("/images", express.static(path.join(__dirname, "../images")));
    app.use("/brand-label-images", express.static(path.join(__dirname, "../brand-label-images")));

    const allowed = ["192.168.1.200:4000", "192.168.1.120:4000", "localhost:4000", "127.0.0.1:4000", "quaysports.duckdns.org", "92.207.0.213"];
    app.use((req, res, next) => {
        // allowed.includes(req.headers.host || "") ? next() : res.status(403).send("Forbidden")
        console.log("NODE_ENV:", process.env.NODE_ENV);
        console.log("Current allowed hosts:", allowed);
        if (allowed.includes(req.headers.host || "") || req.headers.host?.includes("192.168.137.")) { // Packing PC hotspot IP
            console.log("Host allowed:", req.headers.host);
            next();
        } else {
            console.log("Rejected request:", {
                host: req.headers.host,
                url: req.url,
                method: req.method,
                ip: req.ip,
                originalUrl: req.originalUrl,
                remoteAddress: req.connection.remoteAddress,
                headers: req.headers
            });
            res.status(403).send("Forbidden");
        }
    })

    //CORS filtering
    app.use(function (req, res, next) {
        if (req.headers.origin) {
            res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
        }
        res.header("Access-Control-Allow-Credentials", "true")
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, authorization, token");
        next();
    });

    // app.use((req, res, next) => {
    //     let token = req.headers.token?.toString() as "" | undefined
    //     token && token === process.env.TOKEN ? next() : res.sendStatus(403)
    // })
    app.use((req, res, next) => {
        let token = req.headers.token?.toString() as "" | undefined
        if (token && token === process.env.TOKEN) {
            next();
        } else {
            console.log("Token authentication failed:", {
                token: token,
                url: req.url,
                method: req.method,
                host: req.headers.host
            });
            res.sendStatus(403);
        }
    })

    console.log("Mongo Ping: ", await ping())

    // System ping
    app.post('/Ping', async (req, res) => {
        res.send(await ping())
    });

    app.use('/Items/', itemRoutes)
    app.use('/Margin/', marginRoutes)
    app.use('/Reports/', reportRoutes)
}