import { generateStaticIpName, wait } from "$lib/utils";
import type { Domain, Instance, StaticIp } from "@aws-sdk/client-lightsail";
import type { RegionRequestHandler } from "./aws_handlers";
import { constantDomainsMap } from "./constant_domains";
import type { CronHandler } from "./crons";
import { logger } from "./utils";

// TODO: Add error handling
export async function rotateInstance(mInstance: Instance, regionRequesthandler: RegionRequestHandler, cronHandler: CronHandler) {
    // NOTE: Does this need to be here?
    cronHandler.attachEmptyCronToInstancesIfNeeded(regionRequesthandler.instances)

    // INFO: Information gathering and validation
    const instanceId: string = mInstance.arn ?? '';
    if (instanceId === '') { logger.error(`RotateInstance: ${mInstance.name} instance id empty`); return false };
    if (!mInstance.name) { logger.error(`RotateInstance: ${mInstance.name} instance name empty`); return false };
    if (!mInstance.isStaticIp) { logger.error(`RotateInstance: ${mInstance.name} intstance name doesnt have static ips`); return false };
    let instanceRegion = mInstance.location?.regionName ?? '';
    if (!instanceRegion) { logger.error(`RotateInstasnce: ${mInstance.name} doesn't have region`); return false };
    const refreshedInstances = await regionRequesthandler.refreshInstances()
    const refreshedDomains = await regionRequesthandler.refreshDomains()

    let instance = regionRequesthandler.instances.find((i) => i.arn === mInstance.arn);
    if (!instance) { logger.error(`RotateInstance: ${mInstance.name} not found`); return false };
    if (!instance.name) { logger.error(`RotateInstance: ${instance} doesnt have name`); return false };

    const currentStaticIpAddress = instance.publicIpAddress;
    const currentStaticIp = regionRequesthandler.static_ips.find((ip) => ip.ipAddress === currentStaticIpAddress);
    if (!currentStaticIp) {
        logger.warn(`RotateInstance: ${instance.name} doesnt have static ip`);
        // TODO: Attach STATIC IP
        return false
    }
    const currentStaticIpName = currentStaticIp?.name;
    logger.info(`RotateInstance: ${instance.name} current staic ip: ${currentStaticIp}`);


    const constantDomainName = constantDomainsMap.get(instance.arn!)
    if (!constantDomainName) { logger.error(`RotateInstance: ${instance.name} doesnt have constant domain`); return false };

    let currentDomain: Domain | undefined

    console.log(regionRequesthandler.domains);
    console.log(regionRequesthandler.domains);
    console.log(regionRequesthandler.domains);
    console.log(regionRequesthandler.domains);
    for (let domain of regionRequesthandler.domains) {
        const addressDomainEntries = domain.domainEntries?.filter((de) => de.type === "A");
        console.warn(addressDomainEntries);
        console.error(addressDomainEntries);
        console.log(addressDomainEntries);
        console.log(addressDomainEntries);
        if (addressDomainEntries) {
            if (addressDomainEntries.find((de) => de.name === constantDomainName)) {
                currentDomain = domain
                break;
            }
            //     if (addressDomainEntries.find((de) => de.target === currentStaticIpAddress)) {
            //         currentDomains = [...currentDomains, domain];
            //     }
        }
    }


    logger.info(`RotateInstance: ${instance.name} connected domain ${currentDomain}`);
    if (!currentStaticIp || !currentStaticIpName || !currentDomain) { logger.error(``); return false };

    // INFO: Operation 1: detach current static ip
    let res = await regionRequesthandler.detachStaticIpFromInstance(instance.name);
    if (res) {
        logger.info(`RotateInstance: ${instance.name} Detached Previous IP: ${currentStaticIpName} from instance`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to detach static ip from instance`);
        return false;
    }

    // INFO: Operation 2: release detached static ip
    res = await regionRequesthandler.releaseStaticIp(currentStaticIpName);
    if (res) {
        logger.info(`RotateInstance: ${instance.name} Released Previous IP: ${currentStaticIpName}`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to release previous static ip ${currentStaticIpName}`);
        return false;
    }

    // INFO: Operation 3: Allocate New IP:
    let newIpName = generateStaticIpName(Math.floor(Math.random() * 100000000));

    res = await regionRequesthandler.allocateStaticIp(newIpName);
    if (res) {
        logger.info(`RotateInstance: ${instance.name} Allocated New Static IP: ${newIpName}`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to allocate new static ip ${newIpName}}`);
        return false;
    }





    // INFO: Operation 4: Attach allocated new ip:
    res = await regionRequesthandler.attachStaticIpToInstance(instance.name, newIpName);
    if (res) {
        logger.info(`RotateInstance: ${instance.name} Attached New IP: ${newIpName} to instance`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to attach new static ip ${newIpName} to instance`);
        return false;
    }

    // INFO: Operation 5: Find ip address of new static ip
    const refreshedStaticIPs = await regionRequesthandler.refreshStaticIps()
    if (!refreshedStaticIPs) {
        logger.error(`RotateInstance: ${instance.name} Failed to refresh static ips`);
        return false;
    }
    let newStaticIpAddress = regionRequesthandler.static_ips.find((ip) => ip.name === newIpName)?.ipAddress;
    if (!newStaticIpAddress) { logger.error(`RotateInstance: ${instance.name} Failed to find new static ip address`); return false }
    console.warn(newStaticIpAddress);
    // await wait(1000);

    // INFO: Operation 6: Clear previous domain entries pointing to previous static ip
    res = await regionRequesthandler.clearDomainIps(currentDomain.name!,
        [currentStaticIp.ipAddress!]);
    if (!res) { logger.error(`RotateInstance: ${instance.name} Failed to clear previous domain entries pointing to previous static ip`); return false };

    logger.info(`RotateInstance: ${instance.name} Cleared Previous domains entries pointing to previous static ip`);


    // await wait(1000);


    // await wait(1000);


    // await wait(1000);

    // const newInstancesRefreshed = await regionRequesthandler.refreshInstances()
    // if (newInstancesRefreshed) {
    //     logger.info(`RotateInstance: ${instance.name} Refreshed Instances`);
    // } else {
    //     logger.error(`RotateInstance: ${instance.name} Failed to refresh instances`);
    //     return false;
    // }
    //
    // const myInstance = regionRequesthandler.instances.find((i) => i.name === instance?.name);
    // if (myInstance) {
    //     logger.info(`RotateInstance: ${instance.name} Found updated instance`);
    // } else {
    //     logger.error(`RotateInstance: ${instance.name} Failed to find updated instance`);
    //     return false;
    // }

    // INFO: Operation 7: Point domain to new static ip
    res = await regionRequesthandler.pointDomainToIp(currentDomain?.name!, constantDomainName, newStaticIpAddress);
    if (res) {
        logger.info(`RotateInstance: ${instance.name} Pointed domain ${currentDomain} to new ip ${newStaticIpAddress} by ${constantDomainName}`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to point domain ${currentDomain} to new ip ${newStaticIpAddress} by ${constantDomainName}`);
        return false;
    }

    if (res) {
        logger.info(`RotateInstance: ${instance.name} Successfully rotated instance`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to rotate instance`);
    }
    return res;
}




