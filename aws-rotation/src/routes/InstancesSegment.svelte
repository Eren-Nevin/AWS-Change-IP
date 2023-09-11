<script lang="ts">
    import type {
        Domain,
        Instance,
        RegionName,
    } from "@aws-sdk/client-lightsail";
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import InstanceComponent from "./InstanceComponent.svelte";
    import type { RegionResources } from "$lib/models";
    export let selectedRegion: RegionName;
    export let allRegions: boolean;

    let regionResources = getContext<Writable<RegionResources[]>>("resources");

    $: instances = allRegions
        ? $regionResources.map((r) => r.instances).flat()
        : $regionResources.find((r) => r.region === selectedRegion)
              ?.instances ?? [];

    // $: console.log(instances);
</script>

<div class="flex flex-wrap py-8">
    {#if instances.length}
        {#each instances as instance}
            <div class="card w-96 bg-base-100 shadow-xl">
                <InstanceComponent {instance} />
            </div>
        {/each}
    {:else}
        <div class="m-auto">
            <p>No instances found</p>
        </div>
    {/if}
</div>
