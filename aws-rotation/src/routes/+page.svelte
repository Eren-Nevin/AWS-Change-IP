<script lang="ts">
    import type { Domain, Instance, StaticIp } from "@aws-sdk/client-lightsail";
    import { each } from "svelte/internal";
    import InstanceComponent from "./InstanceComponent.svelte";

    import { getDomainPointedIp } from "$lib/utils";

    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";

    let instances = getContext<Writable<Instance[]>>("instances");
    let staticIps = getContext<Writable<StaticIp[]>>("staticIps");
    let domains = getContext<Writable<Domain[]>>("domains");

    async function refreshStores() {
        async function getResource(resource: string) {
            let res = await fetch(`/api?resource=${resource}`, {
                method: "POST",
                body: JSON.stringify({}),
                headers: {
                    "content-type": "application/json",
                },
            });

            const resObj = await res.json();
            return resObj;
        }
        instances.set(await getResource("instance"));
        staticIps.set(await getResource("staticIp"));
        domains.set(await getResource("domain"));
    }
</script>

<h1>Welcome to SvelteKit</h1>
<p>
    Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation
</p>
<div class="flex flex-wrap">
    {#each $instances as instance}
        <div class="card w-96 bg-base-100 shadow-xl">
            <InstanceComponent {instance} />
        </div>
    {/each}
</div>
<div class="divider" />
<div class="flex flex-wrap">
    {#each $staticIps as ip}
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
<div class="divider" />
<div class="flex flex-wrap">
    {#each $domains as domain}
        <div class="card w-96 bg-base-100 shadow-xl">
            <div class="card-body">
                <h2 class="card-title">Card title!</h2>
                <p>{domain.name}</p>
                {#if domain.domainEntries}
                    <p>{getDomainPointedIp(domain)}</p>
                {/if}
                <div class="card-actions justify-end">
                    <button class="btn btn-primary">Buy Now</button>
                </div>
            </div>
        </div>
    {/each}
</div>
<div class="flex flex-row my-8">
    <button class="btn btn-primary btn-sm" on:click={refreshStores}>
        Referesh
    </button>
</div>
