import { Command, Resource } from "./models";

export async function callBackend(searchParams: URLSearchParams) {
    let res = await fetch(`/api?${searchParams}`, {
        method: "POST",
        body: JSON.stringify({}),
        headers: {
            "content-type": "application/json",
        },
    });
    return res
}

export async function refreshResource(region: string, resource: string) {
    let searchParams = new URLSearchParams();
    searchParams.set("region", region);
    searchParams.set("command", Command.REFRESH_RESOURCE);
    searchParams.set("resource", resource);
    let res = await callBackend(searchParams);
    const resObj = await res.json();
    return resObj;
}

export async function getResource(region: string, resource: string) {
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
    searchParams.set(Resource.STATIC_IP, new_name);
    searchParams.set("command", Command.ALLOCATE_IP);
    const res = await callBackend(searchParams);
    return await res.json();
}

export async function detachStaticIp(region: string, static_ip_name: string) {
    let searchParams = new URLSearchParams();
    searchParams.set("region", region);
    searchParams.set("command", Command.DETACH_IP);
    searchParams.set(Resource.STATIC_IP, static_ip_name);
    let res = await callBackend(searchParams);
    return await res.json();
}

export async function detachStaticIpFromInstance(region: string, instance_name: string) {
    let searchParams = new URLSearchParams();
    searchParams.set("region", region);
    searchParams.set("command", Command.DETACH_IP);
    searchParams.set(Resource.INSTANCE, instance_name);
    let res = await callBackend(searchParams);
    return await res.json();
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
    const res = await callBackend(searchParams);
    return await res.json();
}

export async function releaseStaticIp(region: string, static_ip_name: string) {
    let searchParams = new URLSearchParams();
    searchParams.set("region", region);
    searchParams.set("command", Command.RELEASE_IP);
    searchParams.set(Resource.STATIC_IP, static_ip_name);
    const res = await callBackend(searchParams);
    return await res.json();
}

export async function deleteDomainIPs(region: string, domain_name: string) {
    let searchParams = new URLSearchParams();
    searchParams.set("region", region);
    searchParams.set("command", Command.DELETE_DOMAIN_IPS);
    searchParams.set(Resource.DOMAIN, domain_name);
    const res = await callBackend(searchParams);
    return await res.json();
}

export async function pointDomainToIP(region: string, domain_name: string, ip_address: string) {
    let searchParams = new URLSearchParams();
    searchParams.set("region", region);
    searchParams.set("command", Command.POINT_DOMAIN);
    searchParams.set(Resource.DOMAIN, domain_name);
    searchParams.set("ip_address", ip_address);
    const res = await callBackend(searchParams);
    return await res.json();
}

