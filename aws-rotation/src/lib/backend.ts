import { Command, FixedTimeCron, InstanceCron, IntervalCron, RegionName, Resource } from "./models";

// TODO: Change all instance names to instance ids
// TODO: Remove region from domain related functions
export async function callBackend(searchParams: URLSearchParams, body = {}) {
    let res = await fetch(`/api?${searchParams}`, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
            "content-type": "application/json",
        },
    });
    return res
}

export async function readCronsFromServer(): Promise<InstanceCron[]> {
    let searchParams = new URLSearchParams();
    searchParams.set("region", RegionName.US_EAST_1);
    searchParams.set("command", Command.GET_CRONS);
    let res = await callBackend(searchParams);
    const resObj = await res.json();
    if (resObj['success']) {
        return resObj['payload'].map((e) => _convertServerInstanceCronToInstanceCron(e));
    }
    else {
        throw new Error(resObj['error']);
    }
}

export async function sendCronsToServer(crons: InstanceCron[]) {
    let searchParams = new URLSearchParams();
    searchParams.set("region", RegionName.US_EAST_1);
    searchParams.set("command", Command.SET_CRONS);
    let res = await callBackend(searchParams, crons);
    const resObj = await res.json();
    return resObj;
}

function _convertServerInstanceCronToInstanceCron(resInstanceCron) {
    let instanceCron = new InstanceCron(
        resInstanceCron.instanceId,
        new IntervalCron(resInstanceCron.intervalCron.hours, resInstanceCron.intervalCron.minutes),
        resInstanceCron.fixedTimeCrons.map((e) => new FixedTimeCron(e.hour, e.minute)),

        // resInstanceCron.fixedTimeCrons,
        resInstanceCron.useFixedTimeCron
    );
    return instanceCron;
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
    console.warn(resObj);
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

export async function sendRotateInstanceIP(region: string, instance_name: string) {
    let searchParams = new URLSearchParams();
    searchParams.set("region", region);
    searchParams.set("command", Command.ROTATE_IP);
    searchParams.set(Resource.INSTANCE, instance_name);
    const res = await callBackend(searchParams);
    return await res.json();
}

