<script lang="ts">
    import {
        RegionName,
        type Domain,
        type Instance,
    } from "@aws-sdk/client-lightsail";
    import { getContext, onMount } from "svelte";
    import type { Writable } from "svelte/store";

    import { sendRotateInstanceToServer } from "../lib/strategies";
    import EditModal from "./EditModal.svelte";
    import type {
        FixedTimeCron,
        InstanceCron,
        RegionResources,
    } from "$lib/models";
    import { getDomainsPointedToInstance } from "$lib/utils";
    import {
        saveCronToServer,
        updateDomains,
        updateRegionResources,
    } from "$lib/logic";

    export let instance: Instance;
    $: instanceDisabled = instance.state?.name !== "running";
    $: card_disabled_class = instanceDisabled ? "opacity-50" : "";

    let regionResources = getContext<Writable<RegionResources[]>>("resources");

    let constantDomains =
        getContext<Writable<Map<string, string>>>("constantDomains");
    $: constantDomain = $constantDomains.get(instance.arn ?? "");

    let domains = getContext<Writable<Domain[]>>("domains");
    $: connectedDomains = getDomainsPointedToInstance(instance, $domains);

    let instanceCrons =
        getContext<Writable<Map<string, InstanceCron>>>("crons");

    $: instanceCron = $instanceCrons.get(instance.arn ?? "");

    let editModal: EditModal;

    let manuallyRotatingIp = false;

    async function toggleCron() {
        if (instanceCron) {
            instanceCron.enabled = !instanceCron.enabled;
            await saveCronToServer(
                instance.location?.regionName!,
                instanceCron,
                instance.name!
            );
            instanceCrons.update((crons) => {
                if (!instanceCron) return crons;
                crons.set(instance.arn ?? "", instanceCron);
                return crons;
            });
        }
    }

    async function changeIpManually() {
        manuallyRotatingIp = true;
        const res = await sendRotateInstanceToServer(
            instance.location?.regionName ?? "",
            instance
        );
        console.warn("Final Res", res);
        await updateDomains(domains);
        const properRegion = instance.location?.regionName! as RegionName;
        await updateRegionResources(properRegion, regionResources);
        manuallyRotatingIp = false;
    }
</script>

<div class="card w-[26rem] bg-base-100 shadow-xl">
    <div class="card-body min-h-[24rem] {card_disabled_class}">
        <div class="flex-row flex">
            <h2 class="card-title">{instance.name}</h2>
            <button
                class="btn btn-warning ml-auto"
                disabled={instanceDisabled}
                on:click={() => {
                    editModal.open();
                }}
            >
                Edit
            </button>
        </div>
        <p>
            <span class="field-label">Location</span>
            <span class="field-value">{instance.location?.regionName}</span>
        </p>
        {#if manuallyRotatingIp}
            <div class="w-full h-full flex flex-row justify-center">
                <span
                    class="my-auto loading loading-dots loading-lg text-secondary"
                />
            </div>
        {:else}
            <p>
                <span class="field-label">IP</span>:
                <span class="field-value"
                    >{instance.publicIpAddress}
                    {instance.isStaticIp ? "(Static)" : "(Not Static)"}</span
                >
            </p>
            <p class="field-label">
                Constant Domain: <span class="field-value"
                    >{constantDomain ?? "No Constant Domain"}</span
                >
            </p>
            {#if connectedDomains}
                <p class="field-label">
                    Domain:
                    {#each connectedDomains as connectedDomain}
                        {#if connectedDomain.domainEntries}
                            {#each connectedDomain.domainEntries as domainEntry}
                                {#if domainEntry.target === instance.publicIpAddress}
                                    <span class="field-value">
                                        {domainEntry.name}
                                    </span>
                                {/if}
                            {/each}
                        {/if}
                    {/each}
                </p>
            {:else}
                <p class="field-label">Domain: Not connected</p>
            {/if}
            <div class="flex flex-col my-2 gap-2">
                {#if instanceCron?.enabled}
                    <p class="field-label">
                        IP Rotation:
                        <span class="field-value"
                            >{instanceCron.useFixedTimeCron
                                ? `Fixed Time Rotation`
                                : `Interval Rotation`}</span
                        >
                    </p>
                    {#if instanceCron?.useFixedTimeCron}
                        <ul>
                            {#each instanceCron.fixedTimeCrons as fixedTimeCron}
                                <li class="list-inside list-disc field-value">
                                    {fixedTimeCron}
                                </li>
                            {/each}
                        </ul>
                    {:else}
                        <p class="field-value">{instanceCron?.intervalCron}</p>
                    {/if}
                {:else}
                    <p class="field-label">Rotation Disabled</p>
                {/if}
            </div>
            <div class="card-actions justify-end">
                <button
                    class="btn btn-primary"
                    on:click={async () => {
                        await changeIpManually();
                    }}>Manual Rotation</button
                >
                <button
                    class="btn btn-primary"
                    on:click={async () => {
                        await toggleCron();
                    }}
                    >{instanceCron?.enabled ? "Disable" : "Enable"} Rotation</button
                >
            </div>
            <EditModal
                bind:this={editModal}
                {instance}
                instanceCron={instanceCron}
                {constantDomain}
            />
        {/if}
    </div>
</div>

<style>
    .field-label {
        font-weight: 600;
    }
    .field-value {
        color: #707070;
        font-weight: 400;
    }
</style>
