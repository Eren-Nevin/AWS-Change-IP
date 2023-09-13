import schedule from 'node-schedule';
import { FixedTimeCron, InstanceCron, IntervalCron } from "$lib/models";
import type { Instance } from "@aws-sdk/client-lightsail";
import type { RegionRequestHandler } from './aws_handlers';
import { rotateInstance } from './ip_change';

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
        instanceAllJobs = [];
        let intervalCron = cron.intervalCron;
        if (cron.fixedTimeCrons) {
            for (let fixedTimeCron of cron.fixedTimeCrons) {
                const rule = new schedule.RecurrenceRule();
                rule.hour = fixedTimeCron.hour;
                rule.minute = fixedTimeCron.minute;
                // rule.tz = 'Asia/Tehran';
                // const cronString = `${fixedTimeCron.minute} ${fixedTimeCron.hour} * * *`;
                const job = schedule.scheduleJob(rule, async (d) => {
                    console.log(d.toLocaleString(), "vs", new Date());
                    console.log(d.toLocaleString() + ': ', "Rotating Instance:", instance.name);
                    const res = await rotateInstance(instance, regionRequestHandler, this)
                    if (res) console.log(d.toLocaleString() + ': ', "Instance Rotated", instance.name);
                    else console.log(d.toLocaleString() + ': ', "Instance Rotation Failed", instance.name);
                });
                instanceAllJobs.push(job);
                console.log("Job Scheduled", job.name);
            }
        } else {
            if (intervalCron.minutes > 0) {
                const cronString = `*/${intervalCron.minutes} * * * *`;
                const job = schedule.scheduleJob(cronString, async () => {
                    console.log("Rotating Instance", instance.name);
                    const res = await rotateInstance(instance, regionRequestHandler, this)
                    if (res) console.log("Instance Rotated", instance.name);
                    else console.log("Instance Rotation Failed", instance.name);
                });
                instanceAllJobs.push(job);
                console.log("Job Scheduled", job.name);
            }
        }
        this.allJobs.set(cron.instanceId, instanceAllJobs);
        console.log("All instnaces Jobs", Array.from(this.allJobs.values()).flat().map((j) => `${j.name}: ${j.nextInvocation().toLocaleString()}`));
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
