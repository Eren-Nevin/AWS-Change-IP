import schedule from 'node-schedule';
import { FixedTimeCron, InstanceCron, IntervalCron } from "$lib/models";
import type { Instance } from "@aws-sdk/client-lightsail";
import type { RegionRequestHandler } from './aws_handlers';
import { rotateInstance } from './ip_change';
import { logger } from './utils';

export class CronHandler {
    public allCrons: Map<string, InstanceCron>;
    public allJobs: Map<string, schedule.Job[]>;
    constructor(existingCrons?: Map<string, InstanceCron>) {
        this.allCrons = existingCrons ?? new Map<string, InstanceCron>();
        this.allJobs = new Map<string, schedule.Job[]>();
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

    saveCron(cron: InstanceCron, instance: Instance, regionRequestHandler: RegionRequestHandler) {
        this.allCrons.set(cron.instanceId, cron);
        this.scheduleCron(cron, instance, regionRequestHandler);
    }

    scheduleCron(cron: InstanceCron, instance: Instance, regionRequestHandler: RegionRequestHandler) {
        let instanceAllJobs = this.allJobs.get(cron.instanceId) || [];
        instanceAllJobs.forEach((job) => job.cancel());
        if (!cron.enabled) {
            logger.info(`CronJobs: All cronjobs for ${instance.name} Disabled`);
            return;
        }
        instanceAllJobs = [];
        let intervalCron = cron.intervalCron;
        if (cron.useFixedTimeCron) {
            for (let fixedTimeCron of cron.fixedTimeCrons) {
                const rule = new schedule.RecurrenceRule();
                rule.hour = fixedTimeCron.hour;
                rule.minute = fixedTimeCron.minute;
                // rule.tz = 'Asia/Tehran';
                const job = schedule.scheduleJob(instance.arn!, rule, async (scheduledDate) => {
                    logger.info(`CronJob: ${instance.name}: Runnig Job ${job}: For Rotating Instance ${instance.name}`);
                    const res = await rotateInstance(instance, regionRequestHandler, this)
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
                logger.info("HHASDASDASDASDAS");
                let cronString = `0 */${intervalCron.hours} * * * *`;
                // if (intervalCron.minutes > 0) {
                //     cronString = `*/${intervalCron.minutes} * * * *`;
                // }
                const job = schedule.scheduleJob(instance.arn!, cronString, async (scheduledDate) => {
                    logger.info(`CronJob: ${instance.name}: Runnig Job ${job}: For Rotating Instance ${instance.name}`);
                    const res = await rotateInstance(instance, regionRequestHandler, this)
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
        let cron = new InstanceCron(instance.arn, new IntervalCron(0, 0), [], false);
        return cron;
    }

}
