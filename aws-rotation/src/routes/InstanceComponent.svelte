<script lang="ts">
    import type { Domain, Instance } from "@aws-sdk/client-lightsail";
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import { getDomainPointedIp, getInstanceDomain } from "../lib/utils";

    import { rotateInstance } from "../lib/strategies";
    import type { FixedTimeCron, IntervalCron } from "$lib/models";
    import EditModal from "./EditModal.svelte";

    export let instance: Instance;
    $: instanceDisabled = instance.state?.name !== "running";
    $: card_disabled_class = instanceDisabled ? "opacity-50" : "";

    let domains = getContext<Writable<Domain[]>>("domains");
    $: connectedDomain = getInstanceDomain(instance, $domains);

    let fixedTimes: FixedTimeCron[] = [];
    let intervalTime: IntervalCron = { hours: 0, minutes: 0};
    let editModal: EditModal;
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
        {#if connectedDomain}
            <p>Domain: {connectedDomain.name}</p>
        {:else}
            <p>Domain: Not connected</p>
        {/if}
        <div class="card-actions justify-end">
            <button
                class="btn btn-primary"
                on:click={async () => {
                    const res = await rotateInstance(
                        instance.location?.regionName ?? "",
                        instance
                    );
                    console.warn("Final Res", res);
                }}>Change Ip</button
            >
            <button class="btn btn-primary" on:click={async () => {}}
                >Stop Ip Change</button
            >
        </div>
    </div>
</div>
<EditModal bind:this={editModal} {instance} bind:fixedTimes bind:intervalTime/>
