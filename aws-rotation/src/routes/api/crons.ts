import fs from 'fs';
import schedule from 'node-schedule';
import { FixedTimeCron, InstanceCron, IntervalCron } from "$lib/models";
import type { Instance } from "@aws-sdk/client-lightsail";
import { regionHandlersMap, RegionRequestHandler, } from './aws_handlers';
import { rotateInstance } from './ip_change';
import { logger } from './utils';
import { constantDomainsMap } from './constant_domains';

export class CronHandler {
    public allCrons: Map<string, InstanceCron>;
    public allJobs: Map<string, schedule.Job[]>;
    constructor(existingCrons?: Map<string, InstanceCron>) {
        this.allCrons = existingCrons ?? new Map<string, InstanceCron>();
        this.allJobs = new Map<string, schedule.Job[]>();
    }

    async saveCronsToFile() {
        const onlyCrons = Array.from(this.allCrons.values());

        const cronsJson = JSON.stringify(onlyCrons);
        await fs.promises.writeFile('./appData/crons.json', cronsJson, { encoding: 'utf8' });
        logger.info(`Saved crons to file: ${JSON.stringify(Object.fromEntries(this.allCrons.entries()))}`);
        return true;
    }

    async loadCronsFromFileAndReschedule() {
        try {
            const cronsJson = await fs.promises.readFile('./appData/crons.json', { encoding: 'utf8' });
            const crons = JSON.parse(cronsJson);
            this.allCrons = new Map<string, InstanceCron>(crons.map((cron: InstanceCron) => [cron.instanceId, cron]));
            logger.info(`Loaded crons from file: ${JSON.stringify(Object.fromEntries(this.allCrons.entries()))}`);

            this.rescheduleAllCrons();

            // TODO: Remove all jobs
            return true;
        } catch (err) {
            console.error(err);
            logger.error(`Failed to load crons from file`);
            return false;
        }
    }

    readCrons() {
        let crons: InstanceCron[] = Array.from(this.allCrons.values());
        return crons;
    }

    attachEmptyCronToInstancesIfNeeded(instances: Instance[]) {
        for (let instance of instances) {
            if (instance.arn === undefined) continue;
            let cron = this.allCrons.get(instance.arn);
            if (cron === undefined) {
                logger.info(`Attaching Empty Cron to Instance: ${instance.name}`);
                cron = this.createEmptyCronForInstance(instance);
                if (cron === undefined) continue;
                this.allCrons.set(instance.arn, cron);
            }
        }
    }

    rescheduleAllCrons() {
        const crons = Array.from(this.allCrons.values());
        let res = true;
        crons.forEach((cron) => {
            res = this.rescheduleCron(cron);
            if (!res) {
                logger.error(`CronJobs: Failed to reschedule ALL cron for instance ${cron.instanceId}`);
                return false;
            }

        })
        return res;
    }

    saveAndScheduleCron(cron: InstanceCron) {
        this.allCrons.set(cron.instanceId, cron);
        const res = this.rescheduleCron(cron);
        return res;
    }

    rescheduleCron(cron: InstanceCron) {
        const handler = regionHandlersMap.get(cron.region);
        if (!handler) {
            logger.error(`CronJobs: Region ${cron.region} Not Found`);
            return false;
        }
        const instance = handler.instances.find((i) => i.arn === cron.instanceId);
        if (!instance) {
            logger.error(`CronJobs: Instance ${cron.instanceId} Not Found in region ${cron.region}`);
            return false;
        }

        const hasConstantDomain = constantDomainsMap.get(cron.instanceId)
        if (!hasConstantDomain) {
            logger.error(`CronJobs: Instance ${cron.instanceId} doesn't have a constant domain`);
            return false;
        }

        let instanceAllJobs = this.allJobs.get(cron.instanceId) || [];
        instanceAllJobs.forEach((job) => job.cancel());
        if (!cron.enabled) {
            logger.info(`CronJobs: All cronjobs for ${instance.name} Disabled`);
            return false;
        }
        instanceAllJobs = [];
        let intervalCron = cron.intervalCron;
        if (cron.useFixedTimeCron) {
            for (let fixedTimeCron of cron.fixedTimeCrons) {
                const rule = new schedule.RecurrenceRule();
                rule.hour = fixedTimeCron.hour;
                rule.minute = fixedTimeCron.minute;
                rule.tz = 'GMT';
                const job = schedule.scheduleJob(instance.arn!, rule, async (scheduledDate) => {
                    logger.info(`CronJob: ${instance.name}: Runnig Job ${job}: For Rotating Instance ${instance.name}`);
                    const res = await rotateInstance(instance)
                    if (res) {
                        logger.info(`CronJob: ${instance.name}: Runnig Job ${job}Instance rotated ${instance.name}`);
                    } else {
                        logger.error(`CronJob: ${instance.name}: Runnig Job ${job}Instance FAILED TO ROTATE ${instance.name}`);
                    }
                });
                instanceAllJobs.push(job);
                logger.info(`Job ${job} Scheduled`);
            }
        } else {
            if (intervalCron.hours == 0) {
                logger.info(`CronJobs: No cronjobs for ${instance.name} Set since hour is zero`);
            }

            // else if (intervalCron.hours !== 0 && intervalCron.minutes !== 0) {
            //     logger.warn(`CronJobs: No cronjobs for ${instance.name} Set since hour and minute are both non-zero in the interval scenario. Only one should be non-zero`);
            // } 
            else {
                let cronString = `0 0 */${intervalCron.hours} * * *`;

                const job = schedule.scheduleJob(instance.arn!, cronString, async (scheduledDate) => {
                    logger.info(`CronJob: ${instance.name}: Runnig Job ${job}: For Rotating Instance ${instance.name}`);
                    const res = await rotateInstance(instance)
                    if (res) {
                        logger.info(`CronJob: ${instance.name}: Runnig Job ${job}Instance rotated ${instance.name}`);
                    } else {
                        logger.error(`CronJob: ${instance.name}: Runnig Job ${job}Instance FAILED TO ROTATE ${instance.name}`);
                    }
                });
                instanceAllJobs.push(job);
                logger.error(`Job ${job} Scheduled`);
            }
        }
        this.allJobs.set(cron.instanceId, instanceAllJobs);
        logger.info(`CronJobs:Cronjobs for ${instance.name} Set`);

        return true;
    }

    convertFixedTimesCronToRule(fixedTimesCrons: FixedTimeCron[]) {
        let rule = new schedule.RecurrenceRule();
    }

    convertIntervalCronToCronString(intervalCron: IntervalCron) {
    }


    clearCrons() {
        this.allCrons.clear();
    }

    createEmptyCronForInstance(instance: Instance) {
        if (instance.arn === undefined) return;
        let cron = new InstanceCron(instance.arn, instance.location?.regionName!, new IntervalCron(0, 0), [], false, false);
        return cron;
    }

}
