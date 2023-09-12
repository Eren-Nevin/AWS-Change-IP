import { json, text, type RequestHandler } from "@sveltejs/kit";
import type { Credentials } from "@aws-sdk/types";

import { env } from "$env/dynamic/public";

import {
    AllocateStaticIpCommand,
    LightsailClient,
    type ClientDefaults,
    GetDomainsCommand,
    GetStaticIpsCommand,
    DetachStaticIpCommand,
    GetInstancesCommand,
    GetInstanceCommand,
    type Instance,
    AttachStaticIpCommand,
    GetStaticIpCommand,
    type StaticIp,
    type Domain,
    type Operation,
    GetDomainCommand,
    ReleaseStaticIpCommand,
    UpdateDomainEntryCommand,
    DeleteDomainEntryCommand,
    CreateDomainEntryCommand,
} from "@aws-sdk/client-lightsail";
import type { RequestEvent } from "./$types";
import { Command, Resource, RegionName } from "../../lib/models";
import { attachEmptyCronToInstances, readCrons, saveCrons } from "./crons";
import { generateStaticIpName, wait } from "$lib/utils";

class MyCredentials implements Credentials {
    accessKeyId: string = env.PUBLIC_ACCESS_KEY ?? "";
    secretAccessKey: string = env.PUBLIC_SECRET ?? "";
}

let domainClientDefaults = {
    credentialDefaultProvider: (input: any) => async () => {
        return new MyCredentials();
    },
    region: RegionName.US_EAST_1,
}

class DomainsRequestHandler {
    domainClient = new LightsailClient(domainClientDefaults);
    domains: Domain[] = [];
    async refreshDomains() {
        let listDomainsCommand = new GetDomainsCommand({});
        const res = await this.domainClient.send(listDomainsCommand);
        if (res.domains) {
            this.domains = res.domains;
            return true;
        }
    }
}

class RegionRequestHandler {
    static_ips: StaticIp[] = [];
    instances: Instance[] = [];
    domains: Domain[] = [];
    domainClient = new LightsailClient(domainClientDefaults);
    client: LightsailClient;

    constructor(public region: string) {
        this.client = this.getClient(this.region);
    }


    getClient(region: string) {
        return new LightsailClient({
            credentialDefaultProvider: (input: any) => async () => {
                return new MyCredentials();
            },
            region: region
        });
    }


    // async _getInstanceFromServer(instance_name: string) {
    //     const client = this.getClient(this.region);
    //     const getInstanceCommand = new GetInstanceCommand({ instanceName: instance_name })
    //     const res = await client.send(getInstanceCommand);
    //     return res.instance;
    // }
    //
    // async _getStaticIpInfoFromServer(region: string, static_ip_name: string) {
    //     const client = this.getClient(region);
    //     const getStaticIpInfoCommand = new GetStaticIpCommand({ staticIpName: static_ip_name })
    //     const res = await client.send(getStaticIpInfoCommand);
    //     return res.staticIp;
    // }

    async refreshInstances() {
        const listInstancesCommand = new GetInstancesCommand({});
        const res = await this.client.send(listInstancesCommand);
        if (res.instances) {
            this.instances = res.instances;
            return true;
        }
    }

    async refreshStaticIps() {
        const listStaticIpsCommand = new GetStaticIpsCommand({});
        const res = await this.client.send(listStaticIpsCommand);
        if (res.staticIps) {
            this.static_ips = res.staticIps;
            return true;
        }
    }

    wereOperationsSuccessful(operations: Operation[] | undefined) {
        const statuses = operations?.map((o) => o.status);
        if (!statuses) return false;
        const wasSuccessful = statuses.every((s) => s === 'Succeeded')
        return wasSuccessful;
    }

    async allocateStaticIp(new_static_ip_name: string) {
        const allocateStaticIpCommand = new AllocateStaticIpCommand({ staticIpName: new_static_ip_name });
        const res = await this.client.send(allocateStaticIpCommand);
        return this.wereOperationsSuccessful(res.operations);
    }

    async releaseStaticIp(static_ip_name: string) {
        const releaseStaticIpCommand = new ReleaseStaticIpCommand({ staticIpName: static_ip_name });
        const res = await this.client.send(releaseStaticIpCommand);
        return this.wereOperationsSuccessful(res.operations);
    }

    async getAttachedStaticIp(instance_name: string) {
        const instance = this.instances.find((i) => i.name === instance_name);
        if (!instance) return undefined;
        if (!instance.isStaticIp) return undefined;
        const attachedStaticIp = this.static_ips.find((s) => s.attachedTo === instance.name);
        return attachedStaticIp;
    }

    async detachStaticIp(static_ip_name: string) {
        const detachStaticIpCommand = new DetachStaticIpCommand({ staticIpName: static_ip_name });
        const res = await this.client.send(detachStaticIpCommand);
        return this.wereOperationsSuccessful(res.operations);
    }

    async detachStaticIpFromInstance(instance_name: string) {
        const attachedStaticIp = await this.getAttachedStaticIp(instance_name);
        if (!attachedStaticIp) return false;
        if (attachedStaticIp.name === undefined) return false;
        const wasSuccessful = await this.detachStaticIp(attachedStaticIp.name);
        return wasSuccessful;
    }

    async attachStaticIpToInstance(instance_name: string, static_ip_name: string) {
        const attachStaticIpCommand = new AttachStaticIpCommand({ staticIpName: static_ip_name, instanceName: instance_name });
        const res = await this.client.send(attachStaticIpCommand);
        const wereOperationsSuccessful = this.wereOperationsSuccessful(res.operations);
        return wereOperationsSuccessful;
    }

    async refreshDomains() {
        const getDomainsCommand = new GetDomainsCommand({});
        const res = await this.domainClient.send(getDomainsCommand);
        if (res.domains) {
            this.domains = res.domains;
            // console.log(this.domains[0].domainEntries);
            return true;
        }
    }

    async getSpecificDomainInfo(domain_name: string) {
        const getDomainInfoCommand = new GetDomainCommand({ domainName: domain_name });
        const res = await this.domainClient.send(getDomainInfoCommand);
        return res.domain;
    }

    async clearDomainIps(domain_name: string, ip_address: string[] = []) {
        const domain = await this.getSpecificDomainInfo(domain_name);
        if (!domain) return false;
        const domainEntries = domain.domainEntries;
        if (!domainEntries) return false;
        const typeAEntries = domainEntries.filter((de) => de.type === "A");

        console.log("Deleting some of these domain entries", typeAEntries);

        for (const entry of typeAEntries) {
            if (!entry.target) continue;
            if (ip_address.includes(entry.target)) {
                const deleteDomainEntryCommand = new DeleteDomainEntryCommand({
                    domainName: domain_name,
                    domainEntry: entry,
                });
                const res = await this.domainClient.send(deleteDomainEntryCommand);
                if (!res.operation) return false;
            }
        }
        return true;
    }

    async pointDomainToIp(domain_name: string, ip_address: string) {
        const createDomainEntryCommand = new CreateDomainEntryCommand({
            domainName: domain_name,
            domainEntry: {
                name: domain_name,
                type: "A",
                target: ip_address,
            }
        });
        const res = await this.domainClient.send(createDomainEntryCommand);
        return res.operation ? true : false;
    }

}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let handlersMap = new Map<string, RegionRequestHandler>();

export async function POST(request: RequestEvent): Promise<Response> {
    try {
        const searchParams = request.url.searchParams;
        const command = searchParams.get('command');
        const resource = searchParams.get('resource');
        const region = searchParams.get('region');
        const staticIp = searchParams.get(Resource.STATIC_IP);
        const instance = searchParams.get(Resource.INSTANCE);
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
                        attachEmptyCronToInstances(handler.instances)
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
                if (instance && !staticIp) {
                    res = await handler.detachStaticIpFromInstance(instance);
                    if (!res) return json({ error: 'could not detach static ip from instance' });
                    return json({ success: res });
                } else if (staticIp && !instance) {
                    res = await handler.detachStaticIp(staticIp)
                    if (!res) return json({ error: 'could not detach static ip' });
                    return json({ success: res });
                } else {
                    return json({ error: 'only one of instance or static ip should be present' });
                }
            case Command.ATTACH_IP:
                if (instance && staticIp) {
                    res = await handler.attachStaticIpToInstance(instance, staticIp);
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
                const crons = readCrons();
                return json({ success: true, payload: crons });
            case Command.SET_CRONS:
                const requestBody = await request.request.json();
                // console.warn(requestBody)
                saveCrons(requestBody);
                return json({ success: true });
            case Command.ROTATE_IP:
                if (!instance) return json({ error: 'no instance' });
                res = await rotateInstance(region, handler.instances.find((i) => i.name === instance)!);
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


// TODO: Add error handling
async function rotateInstance(region: string, instance: Instance) {
    if (!instance.name) return false;
    if (!instance.isStaticIp) return false;
    let handler = handlersMap.get(region) ?? new RegionRequestHandler(region);
    const refreshedStaticIPs = await handler.refreshStaticIps()
    // console.log(refreshedStaticIPs);
    // if (!refreshedStaticIPs) return json({ error: 'could not refresh static ips' });
    const refreshedInstances = await handler.refreshInstances()
    // console.log(refreshedInstances);
    // if (!refreshedInstances) return json({ error: 'could not refresh instances' });
    const refreshedDomains = await handler.refreshDomains()
    // console.log(refreshedDomains);
    // if (!refreshedDomains) return json({ error: 'could not refresh domains' });
    attachEmptyCronToInstances(handler.instances)

    const currentStaticIpAddress = instance.publicIpAddress;
    const currentStaticIp = handler.static_ips.find((ip) => ip.ipAddress === currentStaticIpAddress);
    const currentStaticIpName = currentStaticIp?.name;

    // const currentDomain = handler.domains.find((d) => d.domainEntries?.find((de) => de.type === "A")?.target === currentStaticIpAddress);

    let currentDomains: Domain[] = [];

    for (let domain of handler.domains) {
        const addressDomainEntries = domain.domainEntries?.filter((de) => de.type === "A");
        if (addressDomainEntries) {
            if (addressDomainEntries.find((de) => de.target === currentStaticIpAddress)) {
                currentDomains = [...currentDomains, domain];
            }
        }
    }


    console.log("Current domains", currentDomains);
    if (!currentStaticIp || !currentStaticIpName || !currentDomains) return false;

    let newIpName = generateStaticIpName(Math.floor(Math.random() * 10000000));

    console.log("Allocating New Static IP");
    let res = await handler.allocateStaticIp(newIpName);
    console.log(res);

    await wait(1000);

    // TODO: Make sure a single domain is not pointed to multiple IPs
    console.log("Deleting Domain IPs");
    let domainIpsCleared = true;
    for (const domain of currentDomains) {
        res = await handler.clearDomainIps(domain?.name!,
            [currentStaticIp.ipAddress!]);
        console.log(res);
        if (!res) { domainIpsCleared = false; break; }
    }
    if (!domainIpsCleared) return false;

    console.log("Detaching Previous IP");
    res = await handler.detachStaticIpFromInstance(instance.name);
    console.log(res);

    await wait(1000);

    console.log("Attaching New IP");
    res = await handler.attachStaticIpToInstance(instance.name, newIpName);
    console.log(res);

    await wait(1000);

    console.log("Releasing Previous IP");
    res = await handler.releaseStaticIp(currentStaticIpName);
    console.log(res);

    await wait(1000);

    const newInstancesRefreshed = await handler.refreshInstances()
    console.log(newInstancesRefreshed);

    const myInstance = handler.instances.find((i) => i.name === instance.name);
    if (!myInstance) return false;

    console.log("Pointing Domains to New IP");
    let domainsPointed = true;
    for (const domain of currentDomains) {
        res = await handler.pointDomainToIp(domain?.name!, myInstance.publicIpAddress!);
        console.log(res);
        if (!res) { domainsPointed = false; break; }
    }
    if (!domainsPointed) return false;

    return res;


}
