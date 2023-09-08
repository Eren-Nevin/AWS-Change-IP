import type { Domain } from "@aws-sdk/client-lightsail";

export function getDomainPointedIp(domain: Domain) {
    return domain.domainEntries?.find((de) => de.type === "A")?.target;
}
