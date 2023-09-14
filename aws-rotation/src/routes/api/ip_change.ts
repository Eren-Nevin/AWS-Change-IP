import { generateStaticIpName, wait } from "$lib/utils";
import type { Domain, Instance, StaticIp } from "@aws-sdk/client-lightsail";
import type { RegionRequestHandler } from "./aws_handlers";
import { constantDomainsMap } from "./constant_domains";
import type { CronHandler } from "./crons";
import { logger } from "./utils";

// TODO: Add error handling
export async function rotateInstance(mInstance: Instance, regionRequesthandler: RegionRequestHandler, cronHandler: CronHandler) {
    // NOTE: Does this need to be here?
    // cronHandler.attachEmptyCronToInstancesIfNeeded(regionRequesthandler.instances)


    // INFO: Information gathering and validation
    console.time("Info Gathering");
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

    for (let domain of regionRequesthandler.domains) {
        const addressDomainEntries = domain.domainEntries?.filter((de) => de.type === "A");
        if (addressDomainEntries) {
            if (addressDomainEntries.find((de) => de.name === constantDomainName)) {
                currentDomain = domain
                break;
            }
        }
    }


    logger.info(`RotateInstance: ${instance.name} connected domain ${currentDomain}`);
    if (!currentStaticIp || !currentStaticIpName || !currentDomain) { logger.error(``); return false };

    console.timeEnd("Info Gathering");
    console.time("Rotate Instance");
    console.time("Detaching Current Static Ip");
    // INFO: Operation 1: detach current static ip
    // let res = await regionRequesthandler.detachStaticIpFromInstance(instance.name);
    let res = await regionRequesthandler.detachStaticIp(currentStaticIpName)
    if (res) {
        logger.info(`RotateInstance: ${instance.name} Detached Previous IP: ${currentStaticIpName} from instance`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to detach static ip from instance`);
        return false;
    }
    console.timeEnd("Detaching Current Static Ip");

    // INFO: Operation 2: release detached static ip
    console.time("Releasing Previous Static Ip");
    res = await regionRequesthandler.releaseStaticIp(currentStaticIpName);
    if (res) {
        logger.info(`RotateInstance: ${instance.name} Released Previous IP: ${currentStaticIpName}`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to release previous static ip ${currentStaticIpName}`);
        return false;
    }
    console.timeEnd("Releasing Previous Static Ip");

    // INFO: Operation 3: Allocate New IP:

    console.time("Allocating New Static Ip");
    let newIpName = generateStaticIpName(Math.floor(Math.random() * 100000000));

    res = await regionRequesthandler.allocateStaticIp(newIpName);
    if (res) {
        logger.info(`RotateInstance: ${instance.name} Allocated New Static IP: ${newIpName}`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to allocate new static ip ${newIpName}}`);
        return false;
    }
    console.timeEnd("Allocating New Static Ip");

    // INFO: Operation 4: Attach allocated new ip:
    console.time("Attaching New Static Ip");
    res = await regionRequesthandler.attachStaticIpToInstance(instance.name, newIpName);
    if (res) {
        logger.info(`RotateInstance: ${instance.name} Attached New IP: ${newIpName} to instance`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to attach new static ip ${newIpName} to instance`);
        return false;
    }
    console.timeEnd("Attaching New Static Ip");

    // INFO: Operation 5: Find ip address of new static ip
    console.time("Finding New Static Ip Address");
    const refreshedStaticIPs = await regionRequesthandler.refreshStaticIps()
    if (!refreshedStaticIPs) {
        logger.error(`RotateInstance: ${instance.name} Failed to refresh static ips`);
        return false;
    }
    let newStaticIpAddress = regionRequesthandler.static_ips.find((ip) => ip.name === newIpName)?.ipAddress;
    if (!newStaticIpAddress) { logger.error(`RotateInstance: ${instance.name} Failed to find new static ip address`); return false }
    // await wait(1000);
    console.timeEnd("Finding New Static Ip Address");

    // INFO: Operation 6: Clear previous domain entries pointing to previous static ip
    console.time("Clearing Previous Domain Entries");
    res = await regionRequesthandler.clearDomainIps(currentDomain.name!,
        [currentStaticIp.ipAddress!]);
    if (!res) { logger.error(`RotateInstance: ${instance.name} Failed to clear previous domain entries pointing to previous static ip`); return false };

    logger.info(`RotateInstance: ${instance.name} Cleared Previous domains entries pointing to previous static ip`);
    console.timeEnd("Clearing Previous Domain Entries");


    // INFO: Operation 7: Point domain to new static ip
    console.time("Pointing Domain to New Static Ip");
    res = await regionRequesthandler.pointDomainToIp(currentDomain?.name!, constantDomainName, newStaticIpAddress);
    if (res) {
        logger.info(`RotateInstance: ${instance.name} Pointed domain ${currentDomain} to new ip ${newStaticIpAddress} by ${constantDomainName}`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to point domain ${currentDomain} to new ip ${newStaticIpAddress} by ${constantDomainName}`);
        return false;
    }
    console.timeEnd("Pointing Domain to New Static Ip");

    if (res) {
        logger.info(`RotateInstance: ${instance.name} Successfully rotated instance`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to rotate instance`);
    }
    console.timeEnd("Rotate Instance");
    return res;
}




