import type { Domain, Instance, StaticIp } from "@aws-sdk/client-lightsail";
import { allocateStaticIP, attachStaticIP, deleteDomainIPs, detachStaticIp, detachStaticIpFromInstance, pointDomainToIP, refreshResource, releaseStaticIp, sendRotateInstanceIP } from "./backend";
import { Resource } from "./models";
import { generateStaticIpName, wait } from "./utils";

export async function rotateInstance(region: string, instance: Instance) {
    if (!instance.name) return false;
    if (!instance.isStaticIp) return false;

    let staicIps: StaticIp[] = await refreshResource(region, Resource.STATIC_IP);
    if (!staicIps) return false;
    if (!Array.isArray(staicIps)) return false;
    const currentStaticIpAddress = instance.publicIpAddress;
    const currentStaticIp = staicIps.find((ip) => ip.ipAddress === currentStaticIpAddress);
    const currentStaticIpName = currentStaticIp?.name;

    let domains: Domain[] = await refreshResource(region, Resource.DOMAIN);
    if (!domains) return false;
    if (!Array.isArray(domains)) return false;
    const currentDomain = domains.find((d) => d.domainEntries?.find((de) => de.type === "A")?.target === currentStaticIpAddress);


    console.log("Current domain", currentDomain);
    if (!currentStaticIp || !currentStaticIpName || !currentDomain) return false;

    let newIpName = generateStaticIpName(Math.floor(Math.random() * 100000));

    console.log("Allocating New Static IP");
    let res = await allocateStaticIP(region, newIpName);
    if (!res) return false;
    console.log(res);

    await wait(1000);

    // TODO: Make sure a single domain is not pointed to multiple IPs
    console.log("Deleting Domain IPs");
    res = await deleteDomainIPs(region, currentDomain?.name!);
    console.log(res);

    console.log("Detaching Previous IP");
    res = await detachStaticIpFromInstance(region, instance.name);
    if (!res) return false;
    console.log(res);

    await wait(1000);

    console.log("Attaching New IP");
    res = await attachStaticIP(region, newIpName, instance.name);
    if (!res) return false;
    console.log(res);


    await wait(1000);

    console.log("Releasing Previous IP");
    res = await releaseStaticIp(region, currentStaticIpName);
    if (!res) return false;
    console.log(res);

    await wait(1000);


    let instances: Instance[] = await refreshResource(region, Resource.INSTANCE);

    const myInstance = instances.find((i) => i.name === instance.name);
    if (!myInstance) return false;

    console.log("Pointing Domain to New IP");
    res = await pointDomainToIP(region, currentDomain?.name!, myInstance.publicIpAddress!);
    console.log(res);

    return res;
}


export async function sendRotateInstanceToServer(region: string, instance: Instance) {
    const res = sendRotateInstanceIP(region, instance.name!);
    return res;
}
