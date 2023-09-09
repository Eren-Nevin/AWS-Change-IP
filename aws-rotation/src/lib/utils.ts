import type { Domain, Instance } from "@aws-sdk/client-lightsail";

export function getDomainPointedIp(domain: Domain) {
    return domain.domainEntries?.find((de) => de.type === "A")?.target;
}

export async function getDomainPointedInstance(domain: Domain, instances: Instance[]) {
    const domainPointedIp = getDomainPointedIp(domain);
    if (!domainPointedIp) return undefined;
    const pointedInstance = instances.find((i) => i.publicIpAddress === domainPointedIp);
    return pointedInstance;
}

export function getInstanceDomain(instance: Instance, domains: Domain[]) {
    return domains.find((d) => getDomainPointedIp(d) === instance.publicIpAddress);

}

export async function wait(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export function generateStaticIpName(n: number) {
    return `StaticIp-${n}`;
}

