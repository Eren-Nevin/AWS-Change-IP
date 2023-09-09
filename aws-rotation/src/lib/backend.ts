import { Command, Resource } from "./models";

export async function callBackend(searchParams: URLSearchParams) {
    let res = await fetch(`/api?${searchParams}`, {
        method: "POST",
        body: JSON.stringify({}),
        headers: {
            "content-type": "application/json",
        },
    });
    console.log(res);
    return res
}

export async function refreshResource(resource: string, region: string) {
    let searchParams = new URLSearchParams();
    searchParams.set("region", region);
    searchParams.set("command", Command.REFRESH_RESOURCE);
    searchParams.set("resource", resource);
    let res = await callBackend(searchParams);
    const resObj = await res.json();
    return resObj;
}

export async function getResource(resource: string, region: string) {
    let searchParams = new URLSearchParams();
    searchParams.set("region", region);
    searchParams.set("command", Command.GET_RESOURCE);
    searchParams.set("resource", resource);
    let res = await callBackend(searchParams);
    const resObj = await res.json();
    return resObj;
}

export async function allocateStaticIP(region: string, new_name: string) {
    let searchParams = new URLSearchParams();
    searchParams.set("region", region);
    searchParams.set("command", Command.ALLOCATE_IP);
    searchParams.set(Resource.STATIC_IP, new_name);
    const res = await callBackend(searchParams);
    console.log(res);
}

export async function detachStaticIp(region: string, static_ip_name: string) {
    let searchParams = new URLSearchParams();
    searchParams.set("region", region);
    searchParams.set("command", Command.DETACH_IP);
    searchParams.set(Resource.STATIC_IP, static_ip_name);
    let res = await callBackend(searchParams);
    console.log(res);
}

export async function attachStaticIP(
    region: string,
    static_ip_name: string,
    instance_name: string
) {
    let searchParams = new URLSearchParams();
    searchParams.set("region", region);
    searchParams.set("command", Command.ATTACH_IP);
    searchParams.set(Resource.STATIC_IP, static_ip_name);
    searchParams.set(Resource.INSTANCE, instance_name);
    const res = callBackend(searchParams);
    console.log(res);
}

export async function releaseStaticIp(region: string, static_ip_name: string) {
    let searchParams = new URLSearchParams();
    searchParams.set("region", region);
    searchParams.set("command", Command.RELEASE_IP);
    searchParams.set(Resource.STATIC_IP, static_ip_name);
    const res = await callBackend(searchParams);
    console.log(res);
}
