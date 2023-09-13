import type { Domain, Instance } from "@aws-sdk/client-lightsail";

export function getIPsPointedByDomain(domain: Domain) {
    return domain.domainEntries?.filter((de) => de.type === "A")?.map((de) => de.target) ?? [];
}

export function getInstancesPointedByDomain(domain: Domain, instances: Instance[]) {
    const ipsPointedByDomain = getIPsPointedByDomain(domain);
    // if (!ipsPointedByDomain) return undefined;
    const pointedInstances = instances.filter((i) => ipsPointedByDomain.includes(i.publicIpAddress));
    return pointedInstances;
}

export function getDomainsPointedToInstance(instance: Instance, domains: Domain[]) {
    return domains.filter((d) => getIPsPointedByDomain(d)?.includes(instance.publicIpAddress));

}

export async function wait(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export function generateStaticIpName(n: number) {
    return `StaticIp-${n}`;
}


