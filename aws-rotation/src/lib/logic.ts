import { RegionName, type Domain, type Instance, type StaticIp } from "@aws-sdk/client-lightsail";
import type { Writable } from "svelte/store";
import { refreshResource } from "./backend";
import { RegionResources, Resource } from "./models";

export async function updateAllRegionResources(regionResources: Writable<RegionResources[]>) {
    let regions = Object.values(RegionName);
    for (let region of regions) {
        await updateRegionResources(region, regionResources);
    }
}

export async function updateRegionResources(region: RegionName, regionResources: Writable<RegionResources[]>) {

    let instances: null | Instance[] = null;
    let staticIps: null | Instance[] = null;
    // TODO: Use Promise.all
    let instancesRes = await refreshResource(region, Resource.INSTANCE);
    if (Array.isArray(instancesRes)) {
        instances = instancesRes;
        console.log(instances);
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


}

export async function updateDomains(domains: Writable<Domain[]>) {
    let domainsRes = await refreshResource(RegionName.US_EAST_1, Resource.DOMAIN);
    if (Array.isArray(domainsRes)) {
        domains.set(domainsRes);
    } else {
        domains.set([]);
    }
}