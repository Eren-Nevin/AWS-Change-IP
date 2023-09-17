<script lang="ts">
    import { saveContantDomainToServer, saveCronToServer } from "$lib/logic";
    import {
        IntervalCron,
        type InstanceCron,
        FixedTimeCron,
    } from "$lib/models";
    import { getDomainsPointedToInstance } from "$lib/utils";
    import type { Domain, Instance } from "@aws-sdk/client-lightsail";
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";

    export let opened = false;

    export let instance: Instance;
    export let instanceCron: InstanceCron | undefined;
    let instanceCronCopy = structuredClone(instanceCron);
    export let constantDomain: string | undefined;

    let constantDomains =
        getContext<Writable<Map<string, string>>>("constantDomains");
    // $: constantDomain = $constantDomains.get(instance.arn ?? "");

    let domains = getContext<Writable<Domain[]>>("domains");
    $: connectedDomains = getDomainsPointedToInstance(instance, $domains);
    let instanceCrons =
        getContext<Writable<Map<string, InstanceCron>>>("crons");

    export function open() {
        const modal = document.getElementById(
            `edit_instance_${instance.arn}_modal`
        );
        if (modal instanceof HTMLDialogElement) {
            instanceCronCopy = structuredClone(instanceCron);
            console.log("Instance", instanceCron);
            console.log(instanceCronCopy);
            opened = true;
            modal.onclose = async () => {
                opened = false;
            };
            modal.showModal();
        }
    }

    export function close() {
        const modal = document.getElementById(
            `edit_instance_${instance.arn}_modal`
        );
        if (modal instanceof HTMLDialogElement) {
            opened = false;
            modal.close();
        }
    }

    function sanitizeHour(hour: number) {
        return Math.floor(hour > 23 ? 23 : hour < 0 ? 0 : hour);
    }

    function sanitizeMinutes(minute: number) {
        return Math.floor(minute > 59 ? 59 : minute < 0 ? 0 : minute);
    }

    export async function save() {
        await saveCron();
        await saveConstantDomain();
        close();
    }

    export async function saveConstantDomain() {
        if (!instance.arn) {
            return;
        }
        if (!constantDomain) {
            constantDomains.update((domains) => {
                if (!instance.arn) return domains;
                domains.delete(instance.arn);
                return domains;
            });
        } else {
            await saveContantDomainToServer(instance.arn, constantDomain);
            constantDomains.update((domains) => {
                if (!instance.arn || !constantDomain) return domains;
                domains.set(instance.arn, constantDomain);
                return domains;
            });
        }
    }

    export async function saveCron() {
        if (!instanceCronCopy) {
            return;
        }
        if (!instanceCronCopy.useFixedTimeCron) {
            instanceCronCopy.intervalCron = new IntervalCron(
                sanitizeHour(instanceCronCopy.intervalCron.hours),
                sanitizeMinutes(instanceCronCopy.intervalCron.minutes)
            );
        } else {
            instanceCronCopy.fixedTimeCrons =
                instanceCronCopy.fixedTimeCrons.map((cron) => {
                    return new FixedTimeCron(
                        sanitizeHour(cron.hour),
                        sanitizeMinutes(cron.minute)
                    );
                });
        }
        await saveCronToServer(
            instance.location?.regionName!,
            instanceCronCopy,
            instance.name!
        );
        instanceCrons.update((crons) => {
            if (!instanceCronCopy) return crons;
            crons.set(instance.arn ?? "", instanceCronCopy);
            return crons;
        });
    }
    export function cancel() {
        close();
    }
</script>

<dialog id={`edit_instance_${instance.arn}_modal`} class="modal">
    <form method="dialog" class="modal-box overflow-y-scroll">
        {#if !instanceCronCopy}
            <p>Error</p>
        {:else}
            <button
                class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
                on:click={cancel}>✕</button
            >
            <h3 class="font-bold text-lg">{instance.name ?? ""}</h3>
            <!-- Replace this with dropdown -->
            <div class="py-2 flex flex-col gap-2">
                <p>Location: {instance.location?.regionName ?? ""}</p>
                <p>
                    IP: {instance.publicIpAddress}
                    {instance.isStaticIp ? "(Static)" : "(Not Static)"}
                </p>
                <label
                    class="w-full mr-auto label cursor-pointer flex flex-row space-x-2"
                >
                    Constant Domain
                    <input
                        type="text"
                        class="input input-sm input-bordered w-full max-w-xs"
                        bind:value={constantDomain}
                    />
                </label>
                {#if connectedDomains}
                    <p>Domains:</p>
                    {#each connectedDomains as connectedDomain}
                        <p>{connectedDomain.name}</p>
                    {/each}
                {:else}
                    <p>Domain: Not connected</p>
                {/if}
                <label
                    class="mr-auto label cursor-pointer flex flex-row space-x-2"
                >
                    <span class="label-text font-light">Use Fixed Times</span>
                    <input
                        type="checkbox"
                        class="toggle toggle-primary"
                        bind:checked={instanceCronCopy.useFixedTimeCron}
                    />
                </label>
                {#if !instanceCronCopy.useFixedTimeCron}
                    <div
                        class="w-44 flex flex-row gap-2 align-middle items-center"
                    >
                        <p>Every</p>
                        <input
                            type="number"
                            max="23"
                            min="0"
                            placeholder="Name"
                            class="input input-sm input-bordered w-full max-w-xs"
                            bind:value={instanceCronCopy.intervalCron.hours}
                        />
                        <span> Hours</span>
                        <!-- <input -->
                        <!--     type="number" -->
                        <!--     max="59" -->
                        <!--     min="0" -->
                        <!--     placeholder="Name" -->
                        <!--     class="input input-sm input-bordered w-full max-w-xs" -->
                        <!--     bind:value={instanceCronCopy.intervalCron.minutes} -->
                        <!-- /> -->
                    </div>
                {:else}
                    {#each instanceCronCopy.fixedTimeCrons as fixedTime, i}
                        <div class="flex flex-row gap-2 align-middle">
                            <p>At</p>
                            <input
                                type="number"
                                placeholder="Name"
                                class="input input-sm input-bordered w-full max-w-xs"
                                bind:value={instanceCronCopy.fixedTimeCrons[i]
                                    .hour}
                            />
                            <span>:</span>
                            <input
                                type="number"
                                placeholder="Name"
                                class="input input-sm input-bordered w-full max-w-xs"
                                bind:value={instanceCronCopy.fixedTimeCrons[i]
                                    .minute}
                            />
                            <button
                                on:click|stopPropagation|preventDefault={() => {
                                    if (instanceCronCopy) {
                                        console.log(i);
                                        const copiedInstanceCronCopy =
                                            structuredClone(instanceCronCopy);
                                        copiedInstanceCronCopy.fixedTimeCrons.splice(
                                            i,
                                            1
                                        );
                                        instanceCronCopy =
                                            copiedInstanceCronCopy;
                                    }
                                }}>✕</button
                            >
                        </div>
                    {/each}

                    <button
                        class="btn btn-sm btn-primary ml-auto"
                        on:click|stopPropagation|preventDefault={() => {
                            if (instanceCronCopy) {
                                instanceCronCopy.fixedTimeCrons = [
                                    ...instanceCronCopy.fixedTimeCrons,
                                    new FixedTimeCron(0, 0),
                                ];
                            }
                        }}>Add Time</button
                    >
                {/if}
                <button
                    class="w-full btn btn-primary mx-auto"
                    on:click={async () => {
                        await save();
                    }}>Save</button
                >
                <button class="w-full btn btn-primary mx-auto" on:click={cancel}
                    >Cancel</button
                >
            </div>
        {/if}
    </form>

    <form method="dialog" class="modal-backdrop">
        <button>close</button>
    </form>
</dialog>

<style>
    form {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    form::-webkit-scrollbar {
        width: 0;
        height: 0;
    }
</style>
