<script lang="ts">
    import type { Instance } from "@aws-sdk/client-lightsail";

    export let instance: Instance;
    export let connectedDomain: string = "";
    $: instanceDisabled = instance.state?.name !== "running";
    $: card_disabled_class = instanceDisabled ? "opacity-50" : "";
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
            <p>{connectedDomain}</p>
        {/if}
        <div class="card-actions justify-end">
            <button class="btn btn-primary">Buy Now</button>
        </div>
    </div>
</div>
