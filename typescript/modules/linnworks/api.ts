import PostRequest from "./post-request";

interface ApiError {
  message: string;
}

export const getLinnQuery = async <T>(
  query: string
): Promise<linn.Query<T>> => {
  try {
    const response = await PostRequest(
      "/api/Dashboards/ExecuteCustomScriptQuery",
      "script=" + encodeURIComponent(query.replace(/ +(?= )/g, ""))
    );
    return response as linn.Query<T>;
  } catch (error) {
    const apiError = error as ApiError;
    console.error(
      "Error executing custom script query from getLinnQuery:",
      error
    );
    throw new Error(`Failed to execute getLinnQuery: ${apiError.message}`);
  }
};

export const updateLinnItem = async (path: string, updateData: string) => {
  try {
    return await PostRequest(path, updateData);
  } catch (error) {
    const apiError = error as ApiError;
    console.error("updateLinnItem - Error updating Linn item:", error);
    throw new Error(
      `updateLinnItem Failed to update item at ${path}: ${apiError.message}`
    );
  }
};

export const getPostalServices = async () => {
  try {
    const response = await PostRequest(
      "/api/PostalServices/GetPostalServices",
      ""
    );
    return response as linn.PostalService[];
  } catch (error) {
    const apiError = error as ApiError;
    console.error(
      "Error fetching postal services in getPostalServices: ",
      error
    );
    throw new Error(
      `Failed to fetch postal services in getPostalServices: ${apiError.message}`
    );
  }
};
