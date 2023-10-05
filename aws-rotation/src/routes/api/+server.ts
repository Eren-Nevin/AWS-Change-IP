import { json, type RequestHandler } from "@sveltejs/kit";
import fs from 'fs';


import type { RequestEvent } from "./$types";
import { Command, Resource, RegionName, IntervalCron, InstanceCron, FixedTimeCron } from "../../lib/models";
import { CronHandler } from "./crons";
import { regionHandlersMap, RegionRequestHandler } from "./aws_handlers";
import { rotateInstance } from "./ip_change";
import { logger } from "./utils";
import { constantDomainsMap, loadConstantDomainsFromFile, saveConstantDomainsToFile } from "./constant_domains";
import { sendErrorMail } from "./mailer";


function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let cronHandler = new CronHandler();

export async function POST(request: RequestEvent): Promise<Response> {
    try {
        const searchParams = request.url.searchParams;
        const command = searchParams.get('command');
        const resource = searchParams.get('resource');
        const region = searchParams.get('region');
        const staticIp = searchParams.get(Resource.STATIC_IP);
        const instanceName = searchParams.get(Resource.INSTANCE);
        const domain = searchParams.get(Resource.DOMAIN);

        // This is only used when pointing domain to ip, which is address itself not name
        const ip_address = searchParams.get('ip_address');

        if (!region) {
            return json({ error: 'no region' });
        }


        let handler = regionHandlersMap.get(region)!;
        let res = null;
        switch (command) {
            case Command.GET_RESOURCE:
                switch (resource) {
                    case Resource.STATIC_IP:
                        return json(handler.static_ips);
                    case Resource.INSTANCE:
                        return json(handler.instances);
                    case Resource.DOMAIN:
                        return json(handler.domains);
                }

            case Command.REFRESH_RESOURCE:
                switch (resource) {
                    case Resource.STATIC_IP:
                        res = await handler.refreshStaticIps()
                        if (!res) {

                            logger.error(`${region} Error Refreshing Static IPs`);
                            sendErrorMail(`${region} Error Refreshing Static IPs`);

                            return json({ error: 'could not refresh static ips' })
                        };
                        logger.info(`${region} Static IPs refreshed`);
                        return json(handler.static_ips);
                    case Resource.INSTANCE:
                        // sendErrorMail(`${region} Refreshing Instances`);
                        res = await handler.refreshInstances()
                        if (!res) {

                            logger.error(`${region} Error Refreshing Instances`);
                            sendErrorMail(`${region} Error Refreshing Instances`);
                            return json({ error: 'could not refresh instances' })
                        };
                        cronHandler.attachEmptyCronToInstancesIfNeeded(handler.instances)
                        logger.info(`${region} Instances refreshed`);
                        return json(handler.instances);
                    case Resource.DOMAIN:
                        res = await handler.refreshDomains()
                        if (!res) {
                            logger.error(`${region} Error Refreshing Domains`);
                            sendErrorMail(`${region} Error Refreshing Domains`);
                            return json({ error: 'could not refresh domains' })
                        };
                        logger.info(`${region} Domains Refereshed`);
                        return json(handler.domains);
                    default:
                        logger.error(`${region} Uknown Error`);
                        sendErrorMail(`${region} Uknown Error`);
                        return json({ error: 'unknown resource' });
                }
            case Command.ALLOCATE_IP:
                if (staticIp) {
                    res = await handler.allocateStaticIp(staticIp);
                    if (!res) {
                        logger.error(`${region} Error Allocating Static IP: ${staticIp}`);
                        sendErrorMail(`${region} Error Allocating Static IP: ${staticIp}`);

                        return json({ error: 'could not allocate static ip' })
                    };
                    logger.info(`${region} Static IP: ${staticIp} Allocated`);
                    return json({ success: res });
                } else {
                    logger.error(`${region} No IP Name for allocating`);
                    sendErrorMail(`${region} No IP Name for allocating`);
                    return json({ error: 'no ip name' });
                }
            case Command.RELEASE_IP:
                if (staticIp) {
                    res = await handler.releaseStaticIp(staticIp);
                    if (!res) {
                        logger.error(`${region} Error Releasing Static IP: ${staticIp}`);
                        sendErrorMail(`${region} Error Releasing Static IP: ${staticIp}`);

                        return json({ error: 'could not release static ip' })
                    };
                    logger.info(`${region} Static IP : ${staticIp} Released`);
                    return json({ success: res });
                } else {
                    logger.error(`${region} Releasing Static IP: No IP Name`);
                    sendErrorMail(`${region} Releasing Static IP: No IP Name`);
                    return json({ error: 'no ip name' });
                }
            case Command.DETACH_IP:
                if (instanceName && !staticIp) {
                    res = await handler.detachStaticIpFromInstance(instanceName);
                    if (!res) {
                        logger.error(`${region} Error Detaching Static IP from Instance: ${instanceName}`);
                        sendErrorMail(`${region} Error Detaching Static IP from Instance: ${instanceName}`);

                        return json({ error: 'could not detach static ip from instance' })
                    };
                    logger.info(`${region} Static IP Detached from Instance: ${instanceName}`);
                    return json({ success: res });
                } else if (staticIp && !instanceName) {
                    res = await handler.detachStaticIp(staticIp)
                    if (!res) {
                        logger.error(`${region} Error Detaching Static IP: ${staticIp}`);
                        sendErrorMail(`${region} Error Detaching Static IP: ${staticIp}`);

                        return json({ error: 'could not detach static ip' })
                    };
                    logger.info(`${region} Static IP Detached: ${staticIp}`);
                    return json({ success: res });
                } else {
                    logger.error(`${region} Only one of instance or static ip should be present`);
                    sendErrorMail(`${region} Only one of instance or static ip should be present`);
                    return json({ error: 'only one of instance or static ip should be present' });
                }
            case Command.ATTACH_IP:
                if (instanceName && staticIp) {
                    res = await handler.attachStaticIpToInstance(instanceName, staticIp);
                    if (!res) {
                        logger.error(`${region} Error Attaching Static IP ${staticIp} to Instance: ${instanceName}`);
                        sendErrorMail(`${region} Error Attaching Static IP ${staticIp} to Instance: ${instanceName}`);

                        return json({ error: 'could not attach static ip to instance' })
                    };
                    logger.info(`${region} Static IP ${staticIp} Attached to Instance: ${instanceName}`);
                    return json({ success: res });
                } else {
                    logger.error(`${region} No instance or static ip present`);
                    sendErrorMail(`${region} No instance or static ip present`);
                    return json({ error: 'no instance or static ip present' });
                }
            case Command.DELETE_DOMAIN_IPS:
                if (!domain) {
                    logger.error(`${region} No domain provided to delete`);
                    sendErrorMail(`${region} No domain provided to delete`);
                    return json({ error: 'no domain provided to delete' })
                };
                res = await handler.clearDomainIps(domain);
                if (!res) {
                    logger.error(`${region} Could not clear domain ips`);
                    sendErrorMail(`${region} Could not clear domain ips`);


                    return json({ error: 'could not clear domain ips' })
                };
                logger.info(`${region} Domain IPs Cleared`);
                return json({ success: res });
            case Command.POINT_DOMAIN:
                if (!domain) {
                    logger.error(`${region} No domain provided to point`);
                    sendErrorMail(`${region} No domain provided to point`);
                    return json({ error: 'no domain' })
                };
                if (!ip_address) {
                    logger.error(`${region} No ip address provided to point`);
                    sendErrorMail(`${region} No ip address provided to point`);
                    return json({ error: 'no ip address' })
                };
                // TODO: Fix This
                res = await handler.pointDomainToIp(domain, ip_address);
                if (!res) {
                    logger.error(`${region} Could not point ${domain} to ${ip_address}`);
                    sendErrorMail(`${region} Could not point ${domain} to ${ip_address}`);
                    return json({ error: 'could not point domain to ip_address' })
                };
                logger.info(`${region} Domain ${domain} Pointed to ${ip_address}`);
                return json({ success: res });

            case Command.GET_CONSTANT_DOMAINS:
                return json({ success: true, payload: [...constantDomainsMap.entries()] });

            case Command.SET_CONSTANT_DOMAIN:
                const instance_id = searchParams.get('instance_id');
                const domain_name = searchParams.get('domain_name');
                console.warn(instance_id, domain_name);
                if (!instance_id) {
                    logger.error(`${region} No instance id provided to set constant domain`);
                    sendErrorMail(`${region} No instance id provided to set constant domain`);
                    return json({ error: 'no instance id' })
                };
                if (!domain_name) {
                    logger.error(`${region} No domain name provided to set constant domain`);
                    sendErrorMail(`${region} No domain name provided to set constant domain`);
                    return json({ error: 'no domain name' })
                };
                constantDomainsMap.set(instance_id, domain_name);
                logger.info(`${region} Set Constant Domain ${domain_name} for instance ${instance_id}`);
                return json({ success: true });

            case Command.GET_CRONS:
                const crons = cronHandler.readCrons();
                logger.info(`${region} Crons Read ${crons.map((e) => e.toString()).join("\n")}`);
                return json({ success: true, payload: crons });
            case Command.SET_CRON:
                const cronInstanceRaw = await request.request.json();
                const cronInstance = new InstanceCron(
                    cronInstanceRaw.instanceId,
                    region,
                    new IntervalCron(cronInstanceRaw.intervalCron.hours, cronInstanceRaw.intervalCron.minutes),
                    cronInstanceRaw.fixedTimeCrons.map((e) => new FixedTimeCron(e.hour, e.minute)),
                    cronInstanceRaw.useFixedTimeCron,
                    cronInstanceRaw.enabled
                );
                const currentInstance = handler.instances.find((i) => i.name === instanceName);
                if (!currentInstance) {
                    logger.error(`${region} Could not find instance ${instanceName}`);
                    sendErrorMail(`${region} Could not find instance ${instanceName}`);
                }
                cronHandler.saveAndScheduleCron(
                    cronInstance,
                );
                logger.info(`${region} Successfuly Saved Cron ${cronInstance.toString()}`);

                return json({ success: true });
            case Command.ROTATE_IP:
                if (!instanceName) {
                    logger.error(`${region} No instance provided to rotate ${instanceName}`);
                    sendErrorMail(`${region} No instance provided to rotate ${instanceName}`);

                    return json({ error: 'no instance' })
                };
                res = await rotateInstance(handler.instances.find((i) => i.name === instanceName)!);
                if (res) {
                    logger.info(`${region} Rotated IP for ${instanceName}`);
                    return json({ success: res });
                } else {
                    logger.error(`${region} Could not rotate ip for ${instanceName}`);
                    sendErrorMail(`${region} Could not rotate ip for ${instanceName}`);
                    return json({ error: 'could not rotate ip' });
                }

            case Command.SAVE_CONFIG:
                const savedConstantDomains = await saveConstantDomainsToFile()
                const savedCrons = await cronHandler.saveCronsToFile()
                res = savedConstantDomains && savedCrons;
                if (res) {
                    logger.info(`${region} Saved Config`);
                    return json({ success: res });
                } else {
                    logger.error(`${region} Could not save config`);
                    sendErrorMail(`${region} Could not save config`);
                    return json({ error: 'could not save config' });
                }
            case Command.LOAD_CONFIG:

                const loadedConstantDomains = await loadConstantDomainsFromFile()
                const loadedCrons = await cronHandler.loadCronsFromFileAndReschedule()
                res = loadedConstantDomains && loadedCrons;
                if (res) {
                    logger.info(`${region} Loaded Config`);
                    return json({ success: res });
                } else {
                    logger.error(`${region} Could not load config`);
                    sendErrorMail(`${region} Could not load config`);
                    return json({ error: 'could not load config' });
                }
            default:
                logger.error(`${region} Unknown Command ${command}`);
                sendErrorMail(`${region} Unknown Command ${command}`);
                return json({ error: 'unknown command' });

        }

    }
    catch (e) {
        logger.error(`Unknown Error ${e}`);
        sendErrorMail(`Unknown Error ${e}`);
        return json({ error: 'unknown error' });
    }
};


export const GET = (async ({ url }) => {
    console.log(`URL: ${url}`)
    const filename = url.searchParams.get('filename');
    if (filename === null) return json({ error: 'no filename' });
    console.log(filename);

    const fileStream = fs.createReadStream(`./appData/${filename}`)
    if (!fileStream) return json({ error: 'no filestream' });
    return new Response(fileStream, {
        status: 200,
        headers: {
            "Content-type": "application/json",
            "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
        },

    })
}) satisfies RequestHandler;


