import PostRequest from "./post-request";

export const getLinnQuery = async <T>(query: string) => {
    return await PostRequest(
        '/api/Dashboards/ExecuteCustomScriptQuery',
        'script=' + encodeURIComponent(query.replace(/ +(?= )/g, ''))
    ) as linn.Query<T>
}

export const updateLinnItem = async (path: string, updateData: string) => {
    return await PostRequest(
        path,
        updateData
    )
}
export const getPostalServices = async () => {
    return await PostRequest(
        '/api/PostalServices/GetPostalServices',
        ''
    ) as linn.PostalService[]
}