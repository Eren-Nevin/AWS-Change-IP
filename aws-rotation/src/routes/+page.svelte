<script lang="ts">
    import type { Instance, StaticIp } from "@aws-sdk/client-lightsail";
    import { each } from "svelte/internal";

    let instances: Instance[] = [];
    let staticIps: StaticIp[] = [];

    async function getInstances() {
        let res = await fetch("/api?resource=instance", {
            method: "POST",
            body: JSON.stringify({}),
            headers: {
                "content-type": "application/json",
            },
        });


        const resObj = await res.json();

        instances = resObj;
    }

    async function getStaticIps() {
        let res = await fetch("/api?resource=staticIp", {
            method: "POST",
            body: JSON.stringify({}),
            headers: {
                "content-type": "application/json",
            },
        });

        staticIps = await res.json();

    }
</script>

<h1>Welcome to SvelteKit</h1>
<p>
    Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation
</p>
<div class="flex flex-wrap">
    {#each instances as instance}
        <div class="card w-96 bg-base-100 shadow-xl">
            <div class="card-body">
                <h2 class="card-title">Card title!</h2>
                <p>{instance.name}</p>
                <div class="card-actions justify-end">
                    <button class="btn btn-primary">Buy Now</button>
                </div>
            </div>
        </div>
    {/each}
</div>
<div class="divider"></div> 
<div class="flex flex-wrap">
    {#each staticIps as ip}
        <div class="card w-96 bg-base-100 shadow-xl">
            <div class="card-body">
                <h2 class="card-title">Card title!</h2>
                <p>{ip.name}</p>
                <p>{ip.ipAddress}</p>
                <p>{ip.attachedTo}</p>
                <div class="card-actions justify-end">
                    <button class="btn btn-primary">Buy Now</button>
                </div>
            </div>
        </div>
    {/each}
</div>
<div class="flex flex-row">
    <button
        class="btn btn-primary btn-sm"
        on:click={getInstances}
    >
        Instances
    </button>
    <button
        class="btn btn-primary btn-sm"
        on:click={getStaticIps}
    >
        Static IPs
    </button>
</div>
