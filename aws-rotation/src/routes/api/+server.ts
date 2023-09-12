import { json } from "@sveltejs/kit";

import type {
    Instance,
    Domain,
} from "@aws-sdk/client-lightsail";

import type { RequestEvent } from "./$types";
import { Command, Resource, RegionName } from "../../lib/models";
import { CronHandler } from "./crons";
import { generateStaticIpName, wait } from "$lib/utils";
import { RegionRequestHandler } from "./aws_handlers";
import { rotateInstance } from "./ip_change";


function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let handlersMap = new Map<string, RegionRequestHandler>();
let cronHandler = new CronHandler();

export async function POST(request: RequestEvent): Promise<Response> {
    try {
        const searchParams = request.url.searchParams;
        const command = searchParams.get('command');
        const resource = searchParams.get('resource');
        const region = searchParams.get('region');
        const staticIp = searchParams.get(Resource.STATIC_IP);
        const instanceName = searchParams.get(Resource.INSTANCE);
        const domain = searchParams.get(Resource.DOMAIN);

        // This is only used when pointing domain to ip, which is address itself not name
        const ip_address = searchParams.get('ip_address');

        if (!region) {
            return json({ error: 'no region' });
        }


        let handler = handlersMap.get(region) ?? new RegionRequestHandler(region);
        // NOTE: Performance optimization?
        handlersMap.set(region, handler);
        let res = null;
        switch (command) {
            case Command.GET_RESOURCE:
                switch (resource) {
                    case Resource.STATIC_IP:
                        return json(handler.static_ips);
                    case Resource.INSTANCE:
                        return json(handler.instances);
                    case Resource.DOMAIN:
                        return json(handler.domains);
                }

            case Command.REFRESH_RESOURCE:
                switch (resource) {
                    case Resource.STATIC_IP:
                        res = await handler.refreshStaticIps()
                        if (!res) return json({ error: 'could not refresh static ips' });
                        return json(handler.static_ips);
                    case Resource.INSTANCE:
                        res = await handler.refreshInstances()
                        if (!res) return json({ error: 'could not refresh instances' });
                        cronHandler.attachEmptyCronToInstancesIfNeeded(handler.instances)
                        return json(handler.instances);
                    case Resource.DOMAIN:
                        res = await handler.refreshDomains()
                        if (!res) return json({ error: 'could not refresh domains' });
                        return json(handler.domains);
                    default:
                        return json({ error: 'unknown resource' });
                }
            case Command.ALLOCATE_IP:
                if (staticIp) {
                    res = await handler.allocateStaticIp(staticIp);
                    if (!res) return json({ error: 'could not allocate static ip' });
                    return json({ success: res });
                } else {
                    return json({ error: 'no ip name' });
                }
            case Command.RELEASE_IP:
                if (staticIp) {
                    res = await handler.releaseStaticIp(staticIp);
                    if (!res) return json({ error: 'could not release static ip' });
                    return json({ success: res });
                } else {
                    return json({ error: 'no ip name' });
                }
            case Command.DETACH_IP:
                if (instanceName && !staticIp) {
                    res = await handler.detachStaticIpFromInstance(instanceName);
                    if (!res) return json({ error: 'could not detach static ip from instance' });
                    return json({ success: res });
                } else if (staticIp && !instanceName) {
                    res = await handler.detachStaticIp(staticIp)
                    if (!res) return json({ error: 'could not detach static ip' });
                    return json({ success: res });
                } else {
                    return json({ error: 'only one of instance or static ip should be present' });
                }
            case Command.ATTACH_IP:
                if (instanceName && staticIp) {
                    res = await handler.attachStaticIpToInstance(instanceName, staticIp);
                    if (!res) return json({ error: 'could not attach static ip to instance' });
                    return json({ success: res });
                } else {
                    return json({ error: 'no instance or static ip present' });
                }
            case Command.DELETE_DOMAIN_IPS:
                if (!domain) return json({ error: 'no domain' });
                res = await handler.clearDomainIps(domain);
                if (!res) return json({ error: 'could not clear domain ips' });
                return json({ success: res });
            case Command.POINT_DOMAIN:
                if (!domain) return json({ error: 'no domain' });
                if (!ip_address) return json({ error: 'no ip address' });
                res = await handler.pointDomainToIp(domain, ip_address);
                if (!res) return json({ error: 'could not point domain to ip_address' });
                return json({ success: res });
            case Command.GET_CRONS:
                const crons = cronHandler.readCrons();
                return json({ success: true, payload: crons });
            case Command.SET_CRON:
                const cronInstance = await request.request.json();
                console.log(cronInstance)
                const currentInstance = handler.instances.find((i) => i.name === instanceName);
                console.log(currentInstance)
                cronHandler.saveCron(
                    cronInstance,
                    currentInstance!,
                    handler
                );
                return json({ success: true });
            case Command.ROTATE_IP:
                if (!instanceName) return json({ error: 'no instance' });
                res = await rotateInstance(handler.instances.find((i) => i.name === instanceName)!, handler, cronHandler,);
                if (res) {
                    return json({ success: res });
                } else {
                    return json({ error: 'could not rotate ip' });
                }

            default:
                return json({ error: 'unknown command' });

        }

    }
    catch (e) {
        console.error(e);
        return json({ error: 'unknown error' });
    }
};


