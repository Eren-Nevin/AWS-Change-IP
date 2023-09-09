export { RegionName } from "@aws-sdk/client-lightsail";
export enum Resource {
    STATIC_IP = 'staticIp',
    INSTANCE = 'instance',
    DOMAIN = 'domain'
}

export enum Command {
    REFRESH_RESOURCE = 'refresh_resource',
    GET_RESOURCE = 'get_resource',
    ALLOCATE_IP = 'allocate_ip',
    RELEASE_IP = 'release_ip',
    DETACH_IP = 'detach_ip',
    ATTACH_IP = 'attach_ip',
}
