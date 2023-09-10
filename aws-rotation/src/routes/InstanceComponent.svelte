<script lang="ts">
    import {
        RegionName,
        type Domain,
        type Instance,
    } from "@aws-sdk/client-lightsail";
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import { getDomainPointedIp, getInstanceDomain } from "../lib/utils";

    import { rotateInstance } from "../lib/strategies";

    export let instance: Instance;
    $: instanceDisabled = instance.state?.name !== "running";
    $: card_disabled_class = instanceDisabled ? "opacity-50" : "";

    let domains = getContext<Writable<Domain[]>>("domains");
    $: connectedDomain = getInstanceDomain(instance, $domains);
</script>

<div class="card w-96 bg-base-100 shadow-xl">
    <div class="card-body {card_disabled_class}">
        <h2 class="card-title">{instance.name}</h2>
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
        </div>
    </div>
</div>
