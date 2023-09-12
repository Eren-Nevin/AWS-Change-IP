import schedule from 'node-schedule';
import { FixedTimeCron, InstanceCron, IntervalCron } from "$lib/models";
import type { Instance } from "@aws-sdk/client-lightsail";

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

    saveCrons(crons: InstanceCron[]) {
        for (let cron of crons) {
            this.allCrons.set(cron.instanceId, cron);
        }
        this.scheduleCrons();
    }

    scheduleCrons() {
        for (let [instanceId, instanceCron] of this.allCrons.entries()) {
        let instanceAllJobs = this.allJobs.get(instanceId) || [];
            instanceAllJobs.forEach((job) => job.cancel());
            instanceAllJobs = [];
            let intervalCron = instanceCron.intervalCron;
            if (intervalCron.minutes > 0) {
                const cronString = `*/${intervalCron.minutes} * * * *`;
                const job = schedule.scheduleJob(cronString, () => {
                    console.log(`Running cron for instance: ${instanceCron.instanceId}` + instanceId);
                });
                instanceAllJobs.push(job);
                console.log("Job Scheduled", job.name);
            }
            this.allJobs.set(instanceId, instanceAllJobs);
        }
        console.log("All instnaces Jobs", this.allJobs);
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
