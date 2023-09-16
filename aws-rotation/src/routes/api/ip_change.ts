import { generateStaticIpName, wait } from "$lib/utils";
import type { Domain, Instance, StaticIp } from "@aws-sdk/client-lightsail";
import { regionHandlersMap, RegionRequestHandler } from "./aws_handlers";
import { constantDomainsMap } from "./constant_domains";
import type { CronHandler } from "./crons";
import { logger } from "./utils";

let rotateInstanceLock = false;

// TODO: Add error handling
export async function rotateInstance(mInstance: Instance) {
    const regionRequestHandler = regionHandlersMap.get(mInstance.location?.regionName!);
    if (!regionRequestHandler) {
        logger.error(`RotateInstance: ${mInstance.name} region request handler not found`);
        return false;
    }
    // NOTE: Does this need to be here?
    // cronHandler.attachEmptyCronToInstancesIfNeeded(regionRequesthandler.instances)

    while (rotateInstanceLock) {
        logger.info(`RotateInstance: Some other instance is rotating`);
        await wait(15000);
    }
    rotateInstanceLock = true;


    // INFO: Information gathering and validation
    const instanceId: string = mInstance.arn ?? '';
    if (instanceId === '') {
        logger.error(`RotateInstance: ${mInstance.name} instance id empty`);

        rotateInstanceLock = false;
        return false
    };
    if (!mInstance.name) {
        logger.error(`RotateInstance: ${mInstance.name} instance name empty`);
        rotateInstanceLock = false;

        return false
    };
    if (!mInstance.isStaticIp) {
        logger.error(`RotateInstance: ${mInstance.name} intstance name doesnt have static ips`);

        rotateInstanceLock = false;

        return false
    };
    let instanceRegion = mInstance.location?.regionName ?? '';
    if (!instanceRegion) {
        logger.error(`RotateInstasnce: ${mInstance.name} doesn't have region`);

        rotateInstanceLock = false;
        return false
    };

    const refreshedInstances = await regionRequestHandler.refreshInstances()
    const refreshedDomains = await regionRequestHandler.refreshDomains()
    const firstStaticIPReferesh = await regionRequestHandler.refreshStaticIps()

    let instance = regionRequestHandler.instances.find((i) => i.arn === mInstance.arn);
    if (!instance) {
        logger.error(`RotateInstance: ${mInstance.name} not found`);

        rotateInstanceLock = false;
        return false
    };
    if (!instance.name) {
        logger.error(`RotateInstance: ${instance} doesnt have name`);

        rotateInstanceLock = false;
        return false
    };


    const currentStaticIpAddress = instance.publicIpAddress;
    const currentStaticIp = regionRequestHandler.static_ips.find((ip) => ip.ipAddress === currentStaticIpAddress);
    if (!currentStaticIp) {
        logger.warn(`RotateInstance: ${instance.name} doesnt have static ip`);
        rotateInstanceLock = false;
        return false
    }
    const currentStaticIpName = currentStaticIp?.name;
    logger.info(`RotateInstance: ${instance.name} current staic ip: ${currentStaticIp}`);


    const constantDomainName = constantDomainsMap.get(instance.arn!)
    if (!constantDomainName) {
        logger.error(`RotateInstance: ${instance.name} doesnt have constant domain`);

        rotateInstanceLock = false;
        return false
    };

    let currentDomain: Domain | undefined

    for (let domain of regionRequestHandler.domains) {
        const addressDomainEntries = domain.domainEntries?.filter((de) => de.type === "A");
        if (addressDomainEntries) {
            if (addressDomainEntries.find((de) => de.name === constantDomainName)) {
                currentDomain = domain
                break;
            }
        }
    }


    logger.info(`RotateInstance: ${instance.name} connected domain ${currentDomain}`);
    if (!currentStaticIp || !currentStaticIpName || !currentDomain) {
        logger.error(``);

        rotateInstanceLock = false;
        return false
    };

    logger.info(`RotateInstance: ${instance.name} Started`);
    // INFO: Operation 1: detach current static ip
    // let res = await regionRequesthandler.detachStaticIpFromInstance(instance.name);
    let res = await regionRequestHandler.detachStaticIp(currentStaticIpName)
    if (res) {
        logger.info(`RotateInstance: ${instance.name} Detached Previous IP: ${currentStaticIpName} from instance`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to detach static ip from instance`);

        rotateInstanceLock = false;
        return false;
    }

    // INFO: Operation 2: release detached static ip
    res = await regionRequestHandler.releaseStaticIp(currentStaticIpName);
    if (res) {
        logger.info(`RotateInstance: ${instance.name} Released Previous IP: ${currentStaticIpName}`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to release previous static ip ${currentStaticIpName}`);

        rotateInstanceLock = false;
        return false;
    }

    // INFO: Operation 3: Allocate New IP:

    let newIpName = generateStaticIpName(Math.floor(Math.random() * 10000000000));

    res = await regionRequestHandler.allocateStaticIp(newIpName);
    if (res) {
        logger.info(`RotateInstance: ${instance.name} Allocated New Static IP: ${newIpName}`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to allocate new static ip ${newIpName}}`);

        rotateInstanceLock = false;
        return false;
    }

    // INFO: Operation 4: Attach allocated new ip:
    res = await regionRequestHandler.attachStaticIpToInstance(instance.name, newIpName);
    if (res) {
        logger.info(`RotateInstance: ${instance.name} Attached New IP: ${newIpName} to instance`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to attach new static ip ${newIpName} to instance`);
        rotateInstanceLock = false;
        return false;
    }

    // INFO: Operation 5: Find ip address of new static ip
    const refreshedStaticIPs = await regionRequestHandler.refreshStaticIps()
    if (!refreshedStaticIPs) {
        logger.error(`RotateInstance: ${instance.name} Failed to refresh static ips`);
        rotateInstanceLock = false;
        return false;
    }
    let newStaticIpAddress = regionRequestHandler.static_ips.find((ip) => ip.name === newIpName)?.ipAddress;
    if (!newStaticIpAddress) { logger.error(`RotateInstance: ${instance.name} Failed to find new static ip address`); return false }

    // INFO: Operation 6: Clear previous domain entries pointing to previous static ip
    res = await regionRequestHandler.clearDomainIps(currentDomain.name!,
        [currentStaticIp.ipAddress!]);
    if (!res) {
        logger.error(`RotateInstance: ${instance.name} Failed to clear previous domain entries pointing to previous static ip`);

        rotateInstanceLock = false;
        return false
    };

    logger.info(`RotateInstance: ${instance.name} Cleared Previous domains entries pointing to previous static ip`);


    // INFO: Operation 7: Point domain to new static ip
    res = await regionRequestHandler.pointDomainToIp(currentDomain?.name!, constantDomainName, newStaticIpAddress);
    if (res) {
        logger.info(`RotateInstance: ${instance.name} Pointed domain ${currentDomain} to new ip ${newStaticIpAddress} by ${constantDomainName}`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to point domain ${currentDomain} to new ip ${newStaticIpAddress} by ${constantDomainName}`);

        rotateInstanceLock = false;
        return false;
    }

    if (res) {
        logger.info(`RotateInstance: ${instance.name} Successfully rotated instance`);
    } else {
        logger.error(`RotateInstance: ${instance.name} Failed to rotate instance`);
    }
    rotateInstanceLock = false;
    return res;
}




