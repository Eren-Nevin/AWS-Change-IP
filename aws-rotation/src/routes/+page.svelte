<script lang="ts">
    // TODO: Handle backend sent errors
    import {
        RegionName,
        type Domain,
        type Instance,
        type StaticIp,
    } from "@aws-sdk/client-lightsail";

    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";

    import InstancesSegment from "./InstancesSegment.svelte";
    import type { RegionResources } from "../lib/models";
    import {
        updateAllRegionResources,
        updateRegionResources,
    } from "$lib/logic";

    let regionResources = getContext<Writable<RegionResources[]>>("resources");
    let domains = getContext<Writable<Domain[]>>("domains");

    let selectedRegion: RegionName = RegionName.EU_CENTRAL_1;

    let allRegions = false;

    $: console.log(selectedRegion.toString());
</script>

<section class="container border rounded-xl border-gray-400 p-8 m-12">
    <div class="flex flex-row justify-end">
        <input type="checkbox" class="toggle" bind:checked={allRegions} />
        <select
            class="select select-accent w-full max-w-xs"
            bind:value={selectedRegion}
        >
            <option disabled selected>Region</option>
            {#each Object.values(RegionName) as region}
                <option>{region}</option>
            {/each}
        </select>
    </div>
    <div class="flex flex-col py-4">
        <InstancesSegment {selectedRegion} bind:allRegions />
        <!-- <StaticIPsSegment /> -->
        <!-- <DomainsSegment /> -->
    </div>
    <div class="flex flex-row gap-2 justify-end">
        <button
            class="btn btn-primary"
            on:click={async () => {
                // await updateRegionResources(selectedRegion, regionResources);
                await updateAllRegionResources(regionResources);
            }}
        >
            Referesh
        </button>
    </div>
</section>
