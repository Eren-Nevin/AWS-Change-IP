import { json, text, type RequestHandler } from "@sveltejs/kit";
import type { Credentials } from "@aws-sdk/types";

import type { Provider } from "@smithy/types";

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
} from "@aws-sdk/client-lightsail";
import type { RequestEvent } from "./$types";

class MyCredentials implements Credentials {
    accessKeyId: string = env.PUBLIC_ACCESS_KEY ?? "";
    secretAccessKey: string = env.PUBLIC_SECRET ?? "";
}
// class MyClientDefaults implements ClientDefaults {
//     credentialDefaultProvider?:
//         | ((input: any) => Provider<Credentials>)
//         | undefined = (input) => async () => {
//             return new MyCredentials();
//         };
//     region?: string | Provider<string> | undefined
// }
//
enum Regions {
    EU_CENTRAL = 'eu-central-1',
    US_EAST = 'us-east-1'
}

let domainClientDefaults = {
    credentialDefaultProvider: (input: any) => async () => {
        return new MyCredentials();
    },
    region: "us-east-1",
}

// let euClient = new LightsailClient(new MyClientDefaults());
//
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
            return true;
        }
    }

    async getSpecificDomainInfo(domain_name: string) {
        const getDomainInfoCommand = new GetDomainCommand({ domainName: domain_name });
        const res = await this.domainClient.send(getDomainInfoCommand);
        return res.domain;
    }

    getDomainPointedIp(domain: Domain) {
        return domain.domainEntries?.find((de) => de.type === 'A')?.target;
    }

    async getDomainPointedInstance(domain: Domain) {
        const domainPointedIp = this.getDomainPointedIp(domain);
        if (!domainPointedIp) return undefined;
        const pointedInstance = this.instances.find((i) => i.publicIpAddress === domainPointedIp);
        return pointedInstance;
    }






}

const euCenteralHandler = new RegionRequestHandler(Regions.EU_CENTRAL);

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(request: RequestEvent): Promise<Response> {
    const searchParams = request.url.searchParams;
    const resource = searchParams.get('resource');
    let finalRes = {}
    try {
        if (resource === 'staticIp') {
            await euCenteralHandler.refreshStaticIps()
            finalRes = euCenteralHandler.static_ips;
        } else if (resource === 'instance') {
            await euCenteralHandler.refreshInstances()
            finalRes = euCenteralHandler.instances;
        } else if (resource === 'domain') {
            await euCenteralHandler.refreshDomains()
            finalRes = euCenteralHandler.domains;
        }
    } catch (e) {
        console.error(e);
    }
    return json(finalRes);
};

