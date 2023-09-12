import { RegionName, type Domain, type Instance, type StaticIp } from "@aws-sdk/client-lightsail";
import type { Writable } from "svelte/store";
import { refreshResource } from "./backend";

export { RegionName } from "@aws-sdk/client-lightsail";
export enum Resource {
    STATIC_IP = 'staticIp',
    INSTANCE = 'instance',
    DOMAIN = 'domain',
    CRON = 'cron',
}

export class FixedTimeCron {
    constructor(public hour: number, public minute: number) {
    }
    toString() {
        return `At ${this.hour}:${this.minute}`
    }
}

export class IntervalCron {
    constructor(public hours: number, public minutes: number) {
    }
    toString() {
        return `Every ${this.hours}H:${this.minutes}M`
    }
}

export class InstanceCron {
    constructor(
        public instanceId: string,
        public intervalCron: IntervalCron,
        public fixedTimeCrons: FixedTimeCron[],
        public useFixedTimeCron: boolean = false,
    ) {
    }
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
    GET_CRONS = 'get_crons',
    SET_CRON = 'set_crons',
    ROTATE_IP = 'rotate_ip'
}

