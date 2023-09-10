<script lang="ts">
    // TODO: Handle backend sent errors
    import {
        RegionName,
        type Domain,
        type Instance,
        type StaticIp,
    } from "@aws-sdk/client-lightsail";
    import InstanceComponent from "./InstanceComponent.svelte";

    import { getDomainPointedIp } from "$lib/utils";

    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import { Command, Resource } from "../lib/models";

    import {
        allocateStaticIP,
        releaseStaticIp,
        attachStaticIP,
        detachStaticIp,
        getResource,
        refreshResource,
        deleteDomainIPs,
        pointDomainToIP,
    } from "../lib/backend";

    let instances = getContext<Writable<Instance[]>>("instances");
    let staticIps = getContext<Writable<StaticIp[]>>("staticIps");
    let domains = getContext<Writable<Domain[]>>("domains");

    let selectedRegion = RegionName.EU_CENTRAL_1;

    export async function getStores(region: string) {
        instances.set(await getResource(region, Resource.INSTANCE));
        staticIps.set(await getResource(region, Resource.STATIC_IP));
        domains.set(await getResource(region, Resource.DOMAIN));
    }
    export async function refreshStores(region: string) {
        instances.set(await refreshResource(region, Resource.INSTANCE));
        staticIps.set(await refreshResource(region, Resource.STATIC_IP));
        domains.set(await refreshResource(region, Resource.DOMAIN));
    }
</script>

<section class="container p-12">
    <div class="flex flex-row gap-2">
        <button
            class="btn btn-primary"
            on:click={() => getStores(selectedRegion)}
        >
            Get
        </button>
        <button
            class="btn btn-primary"
            on:click={() => refreshStores(selectedRegion)}
        >
            Referesh
        </button>
        <button
            class="btn btn-primary"
            on:click={async () => {
                await allocateStaticIP(selectedRegion, "New-IP");
            }}>Allocate IP</button
        >
        <button
            class="btn btn-primary"
            on:click={async () => {
                await releaseStaticIp(selectedRegion, "New-IP");
            }}>Release IP</button
        >
    </div>

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
                    <p>{ip.attachedTo ?? "Dangling"}</p>
                    <div class="card-actions justify-end">
                        <button
                            class="btn btn-primary"
                            on:click={async () => {
                                if (ip.name) {
                                    await detachStaticIp(
                                        selectedRegion,
                                        ip.name
                                    );
                                }
                            }}>Detach</button
                        >
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
                        <button
                            class="btn btn-primary"
                            on:click={async () => {
                                if (domain.name) {
                                    await deleteDomainIPs(
                                        selectedRegion,
                                        domain.name
                                    );
                                }
                            }}>Delete IPs</button
                        >
                        <button
                            class="btn btn-primary"
                            on:click={async () => {
                                if (domain.name) {
                                    await pointDomainToIP(
                                        selectedRegion,
                                        domain.name,
                                        "52.59.116.167"
                                    );
                                }
                            }}>Point to IP</button
                        >
                    </div>
                </div>
            </div>
        {/each}
    </div>
    <div class="flex flex-row my-8" />
</section>
