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

    $: console.error(selectedRegion);

    $: instances = allRegions
        ? $regionResources.map((r) => r.instances).flat()
        : $regionResources.find((r) => r.region === selectedRegion)
              ?.instances ?? [];

    $: console.log(instances);

    // let instances = getContext<Writable<Instance[]>>("instances");
</script>

<div class="flex flex-wrap py-8">
    {#each instances as instance}
        <div class="card w-96 bg-base-100 shadow-xl">
            <InstanceComponent {instance} />
        </div>
    {/each}
</div>
