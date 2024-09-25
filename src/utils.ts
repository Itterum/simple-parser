// import axios from "axios";
//
// export async function checkHealthProxies(url: string, proxy: string): Promise<boolean | undefined> {
//     try {
//         const response = await axios.get(url, {
//             proxy: {
//                 host: proxy.split(":")[0],
//                 port: parseInt(proxy.split(":")[1])
//             },
//             timeout: 5000
//         });
//
//         return response.status === 200;
//     } catch (error: any) {
//         console.error("Error checking URL with proxy:", error.message);
//     }
// }