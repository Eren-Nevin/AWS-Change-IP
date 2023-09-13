import { generateStaticIpName, wait } from "$lib/utils";
import type { Domain, Instance, StaticIp } from "@aws-sdk/client-lightsail";
import type { RegionRequestHandler } from "./aws_handlers";
import type { CronHandler } from "./crons";

// TODO: Add error handling
export async function rotateInstance(mInstance: Instance, regionRequesthandler: RegionRequestHandler, cronHandler: CronHandler) {
    const instanceId: string = mInstance.arn ?? '';
    if (instanceId === '') return false;
    if (!mInstance.name) return false;
    if (!mInstance.isStaticIp) return false;
    let instanceRegion = mInstance.location?.regionName ?? '';
    if (!instanceRegion) return false;
    const refreshedStaticIPs = await regionRequesthandler.refreshStaticIps()
    const refreshedInstances = await regionRequesthandler.refreshInstances()
    const refreshedDomains = await regionRequesthandler.refreshDomains()
    // NOTE: Does this need to be here?
    cronHandler.attachEmptyCronToInstancesIfNeeded(regionRequesthandler.instances)

    let instance = regionRequesthandler.instances.find((i) => i.arn === mInstance.arn);
    if (!instance) return false;
    if (!instance.name) return false;



    const currentStaticIpAddress = instance.publicIpAddress;
    const currentStaticIp = regionRequesthandler.static_ips.find((ip) => ip.ipAddress === currentStaticIpAddress);
    console.log("Current Static IP", currentStaticIp);
    const currentStaticIpName = currentStaticIp?.name;
    let currentDomains: Domain[] = [];

    for (let domain of regionRequesthandler.domains) {
        const addressDomainEntries = domain.domainEntries?.filter((de) => de.type === "A");
        console.log("ADDRESS DOMAIN ENTRIES");
        console.log(addressDomainEntries);
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
    let res = await regionRequesthandler.allocateStaticIp(newIpName);
    console.log(res);

    await wait(1000);

    // TODO: Make sure a single domain is not pointed to multiple IPs
    console.log("Deleting Domain IPs");
    let domainIpsCleared = true;
    for (const domain of currentDomains) {
        res = await regionRequesthandler.clearDomainIps(domain?.name!,
            [currentStaticIp.ipAddress!]);
        console.log(res);
        if (!res) { domainIpsCleared = false; break; }
    }
    if (!domainIpsCleared) return false;

    console.log("Detaching Previous IP");
    res = await regionRequesthandler.detachStaticIpFromInstance(instance.name);
    console.log(res);

    await wait(1000);

    console.log("Attaching New IP");
    res = await regionRequesthandler.attachStaticIpToInstance(instance.name, newIpName);
    console.log(res);

    await wait(1000);

    console.log("Releasing Previous IP");
    res = await regionRequesthandler.releaseStaticIp(currentStaticIpName);
    console.log(res);

    await wait(1000);

    const newInstancesRefreshed = await regionRequesthandler.refreshInstances()
    console.log(newInstancesRefreshed);

    const myInstance = regionRequesthandler.instances.find((i) => i.name === instance?.name);
    if (!myInstance) return false;

    console.log("Pointing Domains to New IP");
    let domainsPointed = true;
    for (const domain of currentDomains) {
        res = await regionRequesthandler.pointDomainToIp(domain?.name!, myInstance.publicIpAddress!);
        console.log(res);
        if (!res) { domainsPointed = false; break; }
    }
    if (!domainsPointed) return false;

    return res;
}




