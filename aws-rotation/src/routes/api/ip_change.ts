import { generateStaticIpName, wait } from "$lib/utils";
import type { Domain, Instance, StaticIp } from "@aws-sdk/client-lightsail";
import type { RegionRequestHandler } from "./aws_handlers";
import type { CronHandler } from "./crons";
import { logger } from "./utils";

// TODO: Add error handling
export async function rotateInstance(mInstance: Instance, regionRequesthandler: RegionRequestHandler, cronHandler: CronHandler) {
    const instanceId: string = mInstance.arn ?? '';
    if (instanceId === '') { logger.error(`RotateInstance: ${mInstance.name} instance id empty`); return false };
    if (!mInstance.name) { logger.error(`RotateInstance: ${mInstance.name} instance name empty`); return false };
    if (!mInstance.isStaticIp) { logger.error(`RotateInstance: ${mInstance.name} intstance name doesnt have static ips`); return false };
    let instanceRegion = mInstance.location?.regionName ?? '';
    if (!instanceRegion) { logger.error(`RotateInstasnce: ${mInstance.name} doesn't have region`); return false };
    const refreshedStaticIPs = await regionRequesthandler.refreshStaticIps()
    const refreshedInstances = await regionRequesthandler.refreshInstances()
    const refreshedDomains = await regionRequesthandler.refreshDomains()
    // NOTE: Does this need to be here?
    cronHandler.attachEmptyCronToInstancesIfNeeded(regionRequesthandler.instances)

    let instance = regionRequesthandler.instances.find((i) => i.arn === mInstance.arn);
    if (!instance) { logger.error(`RotateInstance: ${mInstance.name} not found`); return false };
    if (!instance.name) { logger.error(`RotateInstance: ${instance} doesnt have name`); return false };



    const currentStaticIpAddress = instance.publicIpAddress;
    const currentStaticIp = regionRequesthandler.static_ips.find((ip) => ip.ipAddress === currentStaticIpAddress);
    logger.info(`RotateInstance: ${instance.name} current staic ip: ${currentStaticIp}`);
    const currentStaticIpName = currentStaticIp?.name;
    let currentDomains: Domain[] = [];

    for (let domain of regionRequesthandler.domains) {
        const addressDomainEntries = domain.domainEntries?.filter((de) => de.type === "A");
        logger.info(addressDomainEntries);
        if (addressDomainEntries) {
            if (addressDomainEntries.find((de) => de.target === currentStaticIpAddress)) {
                currentDomains = [...currentDomains, domain];
            }
        }
    }


    logger.info(`RotateInstance: ${instance.name} connected domains ${currentDomains}`);
    if (!currentStaticIp || !currentStaticIpName || !currentDomains) { logger.error(``); return false };

    let newIpName = generateStaticIpName(Math.floor(Math.random() * 100000000));

    let res = await regionRequesthandler.allocateStaticIp(newIpName);
    if (res) {
        logger.info(`RotateInstance: ${instance.name} Allocated New Static IP: ${newIpName}`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to allocate new static ip ${newIpName}}`);
        return false;
    }

    // await wait(1000);

    // TODO: Make sure a single domain is not pointed to multiple IPs
    let domainIpsCleared = true;
    for (const domain of currentDomains) {
        res = await regionRequesthandler.clearDomainIps(domain?.name!,
            [currentStaticIp.ipAddress!]);
        logger.info(res);
        if (!res) { domainIpsCleared = false; break; }
    }
    if (!domainIpsCleared) { logger.error(`RotateInstance: ${instance.name} Failed to clear previous domain entries pointing to previous static ip`); return false };

    logger.info(`RotateInstance: ${instance.name} Cleared Previous domains entries pointing to previous static ip`);

    res = await regionRequesthandler.detachStaticIpFromInstance(instance.name);
    if (res) {
        logger.info(`RotateInstance: ${instance.name} Detached Previous IP: ${currentStaticIpName} from instance`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to detach static ip from instance`);
        return false;
    }

    // await wait(1000);

    res = await regionRequesthandler.attachStaticIpToInstance(instance.name, newIpName);
    if (res) {
        logger.info(`RotateInstance: ${instance.name} Attached New IP: ${newIpName} to instance`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to attach new static ip ${newIpName} to instance`);
        return false;
    }

    // await wait(1000);

    res = await regionRequesthandler.releaseStaticIp(currentStaticIpName);
    if (res) {
        logger.info(`RotateInstance: ${instance.name} Released Previous IP: ${currentStaticIpName}`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to release previous static ip ${currentStaticIpName}`);
        return false;
    }

    // await wait(1000);

    const newInstancesRefreshed = await regionRequesthandler.refreshInstances()
    if (newInstancesRefreshed) {
        logger.info(`RotateInstance: ${instance.name} Refreshed Instances`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to refresh instances`);
        return false;
    }

    const myInstance = regionRequesthandler.instances.find((i) => i.name === instance?.name);
    if (myInstance) {
        logger.info(`RotateInstance: ${instance.name} Found updated instance`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to find updated instance`);
        return false;
    }

    let domainsPointed = true;
    for (const domain of currentDomains) {
        res = await regionRequesthandler.pointDomainToIp(domain?.name!, myInstance.publicIpAddress!);
        logger.info(res);
        if (!res) { domainsPointed = false; break; }
    }
    if (domainsPointed) {
        logger.info(`RotateInstance: ${instance.name} Pointed domains to new ip`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to point domains to new ip`);
        return false;
    }

    if (res) {
        logger.info(`RotateInstance: ${instance.name} Successfully rotated instance`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to rotate instance`);
    }
    return res;
}




