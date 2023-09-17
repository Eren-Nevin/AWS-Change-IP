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
        return `At ${this.hour}:${this.minute} GMT (${this.toAnotherTimezoneString(3, 30)} IRST)`
    }

    toAnotherTimezoneString(hourDifference: number, minuteDifference: number) {
        let hourCarry = 0
        if (this.minute + minuteDifference >= 60) {
            hourCarry = 1;
        }
        let newMinutes = (this.minute + minuteDifference) % 60;
        let newHours = (this.hour + hourDifference + hourCarry) % 24;
        return `${newHours}:${newMinutes}`
    }

}



export class IntervalCron {
    constructor(public hours: number, public minutes: number) {
    }
    toString() {
        return `Every ${this.hours} H`
    }
}

export class InstanceCron {
    constructor(
        public instanceId: string,
        public region: string,
        public intervalCron: IntervalCron,
        public fixedTimeCrons: FixedTimeCron[],
        public useFixedTimeCron: boolean = false,
        public enabled: boolean = false,
    ) {
    }
    toString() {
        return `Instance: ${this.instanceId}: 
Enabled: ${this.enabled},
${this.useFixedTimeCron ? this.fixedTimeCrons.map((e) => e.toString()) : this.intervalCron.toString()}`
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
    GET_CONSTANT_DOMAINS = 'get_constant_domains',
    SET_CONSTANT_DOMAIN = 'set_constant_domain',
    ROTATE_IP = 'rotate_ip',
    SAVE_CONFIG = 'save_config',
    LOAD_CONFIG = 'load_config',
}

