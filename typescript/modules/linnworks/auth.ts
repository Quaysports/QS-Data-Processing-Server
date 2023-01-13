import https from 'https'
import {findOne, setData} from "../mongo-interface";

interface LinnAuthDetails {
    _id: { $oid: string };
    id: string;
    server: string;
    token: string;
    details: { server: string; token: string };
}
let connectionDetails:LinnAuthDetails["details"] = {server: "", token: ""}

export default async function Auth(workerThread: boolean = false) {
    if (workerThread) {
        return await getLinnworksAuthDetailsFromDB()
    } else {
        return await connectToLinnworksAndGetAuth()
    }
}

const connectToLinnworksAndGetAuth = () => {
    return new Promise<void>(async (resolve) => {
        let postOptions = {
            hostname: 'api.linnworks.net',
            method: 'POST',
            path: '/api/Auth/AuthorizeByApplication',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
            },
        };
        let postData = 'applicationId=5e98796e-63fb-4188-a73b-0b05456f081e&applicationSecret=ad4c386b-d125-4961-9f3c-36340dd33753&token=14744072963ee9ace93725ca8a8c70b2';
        let str = '';
        let postReq = https.request(postOptions, (res) => {
            res.setEncoding('utf8');

            res.on('data', chunk => {
                str += chunk
            });

            res.on('end', async () => {
                let data = JSON.parse(str);
                connectionDetails = {server: data['Server'].replace('https://', ''), token: data['Token']};
                await setData("Server", {id: "Linnworks"}, {id: "Linnworks", details: connectionDetails});
                resolve();
            });
        });
        postReq.write(postData);
        postReq.end()
    })
}

const getLinnworksAuthDetailsFromDB = async () => {
    const result = await findOne<LinnAuthDetails>("Server", {id: "Linnworks"})
    if(!result) return
    connectionDetails = result.details
}

export const getAuthDetails = () => {
    return connectionDetails
}