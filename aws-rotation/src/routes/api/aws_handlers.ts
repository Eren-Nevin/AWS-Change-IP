import type { Credentials } from "@aws-sdk/types";
import {
    AllocateStaticIpCommand,
    LightsailClient,
    GetDomainsCommand,
    GetStaticIpsCommand,
    DetachStaticIpCommand,
    GetInstancesCommand,
    type Instance,
    AttachStaticIpCommand,
    type StaticIp,
    type Domain,
    type Operation,
    GetDomainCommand,
    ReleaseStaticIpCommand,
    DeleteDomainEntryCommand,
    CreateDomainEntryCommand,
    RegionName,
} from "@aws-sdk/client-lightsail";
import { env } from "$env/dynamic/public";

class MyCredentials implements Credentials {
    accessKeyId: string = env.PUBLIC_ACCESS_KEY ?? "";
    secretAccessKey: string = env.PUBLIC_SECRET ?? "";
}

export let regionHandlersMap = new Map<string, RegionRequestHandler>();

let domainClientDefaults = {
    credentialDefaultProvider: (input: any) => async () => {
        return new MyCredentials();
    },
    region: RegionName.US_EAST_1,
}
export class RegionRequestHandler {
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
            return true;
        }
    }

    async getSpecificDomainInfo(domain_name: string) {
        const getDomainInfoCommand = new GetDomainCommand({ domainName: domain_name });
        const res = await this.domainClient.send(getDomainInfoCommand);
        return res.domain;
    }

    async clearDomainIps(domain_name: string, ip_addresses: string[] = []) {
        const domain = await this.getSpecificDomainInfo(domain_name);
        if (!domain) return false;
        const domainEntries = domain.domainEntries;
        if (!domainEntries) return false;
        const typeAEntries = domainEntries.filter((de) => de.type === "A");

        for (const entry of typeAEntries) {
            if (!entry.target) continue;
            if (ip_addresses.includes(entry.target)) {
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

    async pointDomainToIp(domain_name: string, domain_record_name: string, ip_address: string) {
        const createDomainEntryCommand = new CreateDomainEntryCommand({
            domainName: domain_name,
            domainEntry: {
                name: domain_record_name,
                type: "A",
                target: ip_address,
            }
        });
        const res = await this.domainClient.send(createDomainEntryCommand);
        return res.operation ? true : false;
    }

}

export class DomainsRequestHandler {
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
