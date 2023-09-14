import { RegionName, type Domain, type Instance, type StaticIp } from "@aws-sdk/client-lightsail";
import type { Writable } from "svelte/store";
import { readConstantDomainsFromServer, readCronsFromServer, refreshResource, sendConstantDomainToServer, sendCronToServer } from "./backend";
import { InstanceCron, IntervalCron, RegionResources, Resource } from "./models";

export async function updateAllRegionResources(regionResources: Writable<RegionResources[]>) {
    let regions = Object.values(RegionName);
    let allUpdatePromises = []
    for (let region of regions) {
        allUpdatePromises.push(updateRegionResources(region, regionResources));
    }
    let res = Promise.allSettled(allUpdatePromises).then((res) => {
        if (res) { }
    }).catch((e) => console.error(e));

    return res;

    // await updateRegionResources(region, regionResources);
}

export async function updateConstantDomains(constantDomains: Writable<Map<string, string>>) {
    const constantDomainsMap: Map<string, string> = await readConstantDomainsFromServer();
    constantDomains.set(constantDomainsMap);
}

export async function saveContantDomainToServer(instance_id: string, domain_name: string) {
    let res = await sendConstantDomainToServer(instance_id, domain_name);
    return res;
}

export async function updateCrons(instanceCrons: Writable<Map<string, InstanceCron>>) {
    const crons: InstanceCron[] = await readCronsFromServer();
    let cronMap = new Map<string, InstanceCron>();

    for (let cron of crons) {
        cronMap.set(cron.instanceId, cron);
    }
    console.warn(cronMap);
    instanceCrons.update((crons) => {
        crons = cronMap;
        return crons;
    })
}

export async function saveCronToServer(region: string, instanceCron: InstanceCron, instance_name: string) {
    let res = await sendCronToServer(region, instanceCron, instance_name);
    return res;
}


export async function updateRegionResources(region: RegionName, regionResources: Writable<RegionResources[]>) {

    let instances: null | Instance[] = null;
    let staticIps: null | Instance[] = null;
    // TODO: Use Promise.all
    let instancesRes = await refreshResource(region, Resource.INSTANCE);
    if (Array.isArray(instancesRes)) {
        instances = instancesRes;
    }
    let staticIpsRes = await refreshResource(region, Resource.STATIC_IP);
    if (Array.isArray(staticIpsRes)) {
        staticIps = staticIpsRes;
    }

    regionResources.update((resources) => {
        let regionResources = resources.find((r) => r.region === region);
        if (!regionResources) {
            regionResources = new RegionResources();
            regionResources.region = region;
            resources.push(regionResources);
        }
        if (instances !== null) {
            regionResources.instances = instances;
        }
        if (staticIps !== null) {
            regionResources.staticIps = staticIps;
        }
        return resources;
    });

    return true;

}

export async function updateDomains(domains: Writable<Domain[]>) {
    let domainsRes = await refreshResource(RegionName.US_EAST_1, Resource.DOMAIN);
    if (Array.isArray(domainsRes)) {
        domains.set(domainsRes);
    } else {
        domains.set([]);
    }
}
