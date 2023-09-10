import { RegionName, type Domain, type Instance, type StaticIp } from "@aws-sdk/client-lightsail";
import type { Writable } from "svelte/store";
import { refreshResource } from "./backend";

export { RegionName } from "@aws-sdk/client-lightsail";
export enum Resource {
    STATIC_IP = 'staticIp',
    INSTANCE = 'instance',
    DOMAIN = 'domain'
}

export class RegionResources {
    region: RegionName = RegionName.US_EAST_1;
    instances: Instance[] = [];
    staticIps: StaticIp[] = [];
}

export enum Command {
    REFRESH_RESOURCE = 'refresh_resource',
    GET_RESOURCE = 'get_resource',
    ALLOCATE_IP = 'allocate_ip',
    RELEASE_IP = 'release_ip',
    DETACH_IP = 'detach_ip',
    ATTACH_IP = 'attach_ip',
    DELETE_DOMAIN_IPS = 'delete_domain_ips',
    POINT_DOMAIN = 'point_domain',
}


// export async function refreshStores(region: string) {
//         let instancesRes = await refreshResource(region, Resource.INSTANCE);
//         if (Array.isArray(instancesRes)) {
//             instances.set(instancesRes);
//         } else {
//             instances.set([]);
//         }
//         let staticIpsRes = await refreshResource(region, Resource.STATIC_IP);
//         if (Array.isArray(staticIpsRes)) {
//             staticIps.set(staticIpsRes);
//         } else {
//             staticIps.set([]);
//         }
//         let domainsRes = await refreshResource(region, Resource.DOMAIN);
//         if (Array.isArray(domainsRes)) {
//             domains.set(domainsRes);
//         } else {
//             domains.set([]);
//         }
//     }
