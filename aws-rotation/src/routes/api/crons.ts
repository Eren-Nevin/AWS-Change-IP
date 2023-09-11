import { FixedTimeCron, InstanceCron, IntervalCron } from "$lib/models";
import type { Instance } from "@aws-sdk/client-lightsail";

// TODO: Encapsulate in a class with methods to save / load from database

const allCrons: Map<string, InstanceCron> = new Map();

export function readCrons() {
    let crons: InstanceCron[] = Array.from(allCrons.values());
    return crons;
}

export function attachEmptyCronToInstances(instances: Instance[]) {
    for (let instance of instances) {
        if (instance.arn === undefined) continue;
        let cron = allCrons.get(instance.arn);
        if (cron === undefined) {
            cron = createEmptyCronForInstance(instance);
            if (cron === undefined) continue;
            allCrons.set(instance.arn, cron);
        }
    }
}

export function saveCrons(crons: InstanceCron[]) {
    for (let cron of crons) {
        allCrons.set(cron.instanceId, cron);
    }
}

export function createEmptyCronForInstance(instance: Instance) {
    if (instance.arn === undefined) return;
    let cron = new InstanceCron(instance.arn, new IntervalCron(0, 6), [], false);
    return cron;
}
