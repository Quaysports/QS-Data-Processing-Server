import https from 'https'
import {getAuthDetails} from './auth'

const PostRequestOptions = (path: string) => {
    let serverDetails = getAuthDetails()
    return {
        hostname: serverDetails.server,
        method: 'POST',
        path: path,
        headers: {
            'Authorization': serverDetails.token,
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        }
    }
}
export default function PostRequest(path: string, postData: string) {
    return new Promise<object>(resolve => {
        let str = '';
        let postReq = https.request(PostRequestOptions(path), res => {
            res.setEncoding('utf8');
            res.on('data', chunk => str += chunk);
            res.on('end', () => {
                resolve(str ? JSON.parse(str) : {})
            });
        });

        postReq.on('error', (err) => {
            console.error('--------- Linnworks Connection Error ---------')
            console.dir(err)
            console.error(path + ' error')
            console.error('----------------------------------------------')
        });

        postReq.write(postData);
        postReq.end()
    })
}