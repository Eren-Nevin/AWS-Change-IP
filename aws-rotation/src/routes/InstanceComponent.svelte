<script lang="ts">
    import type { Domain, Instance } from "@aws-sdk/client-lightsail";
    import { getContext, onMount } from "svelte";
    import type { Writable } from "svelte/store";

    import { sendRotateInstanceToServer } from "../lib/strategies";
    import EditModal from "./EditModal.svelte";
    import type { FixedTimeCron, InstanceCron } from "$lib/models";
    import { getDomainsPointedToInstance } from "$lib/utils";
    import { saveCronToServer } from "$lib/logic";

    export let instance: Instance;
    $: instanceDisabled = instance.state?.name !== "running";
    $: card_disabled_class = instanceDisabled ? "opacity-50" : "";

    let domains = getContext<Writable<Domain[]>>("domains");
    $: connectedDomains = getDomainsPointedToInstance(instance, $domains);

    let instanceCrons =
        getContext<Writable<Map<string, InstanceCron>>>("crons");

    $: instanceCron = $instanceCrons.get(instance.arn ?? "");

    let editModal: EditModal;

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
</script>

<div class="card w-96 bg-base-100 shadow-xl">
    <div class="card-body {card_disabled_class}">
        <div class="flex-row flex">
            <h2 class="card-title">{instance.name}</h2>
            <button
                class="btn btn-accent ml-auto"
                disabled={instanceDisabled}
                on:click={() => {
                    editModal.open();
                }}
            >
                Edit
            </button>
        </div>
        <p>Location: {instance.location?.regionName}</p>
        <p>
            IP: {instance.publicIpAddress}
            {instance.isStaticIp ? "(Static)" : "(Not Static)"}
        </p>
        {#if connectedDomains}
            <p>Domains:</p>
            {#each connectedDomains as connectedDomain}
                <p>{connectedDomain.name}</p>
            {/each}
        {:else}
            <p>Domain: Not connected</p>
        {/if}
        {#if instanceCron?.useFixedTimeCron}
            <p>Fixed</p>
            {#each instanceCron.fixedTimeCrons as fixedTimeCron}
                <p>
                    {fixedTimeCron}
                </p>
            {/each}
        {:else}
            <p>Interval</p>
            <p>{instanceCron?.intervalCron}</p>
        {/if}
        <div class="card-actions justify-end">
            <button
                class="btn btn-primary"
                on:click={async () => {
                    const res = await sendRotateInstanceToServer(
                        instance.location?.regionName ?? "",
                        instance
                    );
                    console.warn("Final Res", res);
                }}>Manual Change IP</button
            >
            <button
                class="btn btn-primary"
                on:click={async () => {
                    await toggleCron();
                }}
                >{instanceCron?.enabled ? "Disable" : "Enable"} Ip Change</button
            >
        </div>
    </div>
</div>
<EditModal bind:this={editModal} {instance} instanceCronCopy={instanceCron} />
