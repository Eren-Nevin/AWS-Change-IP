import type { Instance, StaticIp } from "@aws-sdk/client-lightsail";
import { allocateStaticIP, attachStaticIP, detachStaticIp, detachStaticIpFromInstance, refreshResource, releaseStaticIp } from "./backend";
import { Resource } from "./models";
import { generateStaticIpName, wait } from "./utils";

export async function changeInstanceIP(region: string, instance: Instance) {
    if (!instance.name) return false;
    if (!instance.isStaticIp) return false;

    const previousStaticIp = instance.publicIpAddress;

    let staicIps = await refreshResource(region, Resource.STATIC_IP);
    if (!staicIps) return false;
    if (!Array.isArray(staicIps)) return false;

    const previousStaticIpName = staicIps.find((ip: StaticIp) => ip.ipAddress === previousStaticIp)?.name;

    let newIpName = generateStaticIpName(Math.floor(Math.random() * 100000));

    let res = await allocateStaticIP(region, newIpName);
    if (!res) return false;

    res = await detachStaticIpFromInstance(region, instance.name);
    if (!res) return false;

    await wait(1000);


    res = await attachStaticIP(region, newIpName,
        instance.name);
    if (!res) return false;

    res = await releaseStaticIp(region, previousStaticIpName);
    if (!res) return false;

    return res;


}
