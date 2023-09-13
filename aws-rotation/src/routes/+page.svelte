<script lang="ts">
    // TODO: Handle backend sent errors
    import {
        RegionName,
        type Domain,
        type Instance,
        type StaticIp,
    } from "@aws-sdk/client-lightsail";

    import { getContext, onMount } from "svelte";
    import type { Writable } from "svelte/store";

    import InstancesSegment from "./InstancesSegment.svelte";
    import type { InstanceCron, RegionResources } from "../lib/models";
    import {
        updateAllRegionResources,
        updateDomains,
        updateRegionResources,
        updateCrons,
    } from "$lib/logic";
    import { downloadAllLogsFromServer } from "$lib/backend";

    let regionResources = getContext<Writable<RegionResources[]>>("resources");
    let domains = getContext<Writable<Domain[]>>("domains");
    let instanceCrons =
        getContext<Writable<Map<string, InstanceCron>>>("crons");

    let selectedRegion: RegionName = RegionName.EU_CENTRAL_1;

    let allRegions = false;

    let refreshing = false;

    let mounted = false;

    $: console.log(selectedRegion.toString());

    $: allRegions, selectedRegion, refreshData();

    async function refreshData() {
        if (!mounted) return;
        console.log("REFERESHING DATA");
        refreshing = true;
        console.log("Refreshing data");
        console.log(selectedRegion);
        await updateDomains(domains);
        if (allRegions) {
            await updateAllRegionResources(regionResources);
        } else {
            await updateRegionResources(selectedRegion, regionResources);
        }
        await updateCrons(instanceCrons);
        refreshing = false;
    }

    onMount(async () => {
        console.log("MOUNT");
        refreshing = true;
        await updateAllRegionResources(regionResources);
        await updateCrons(instanceCrons);
        refreshing = false;
        mounted = true;
    });
</script>

<section class="container border rounded-xl border-gray-400 p-8 m-12">
    <div class="flex flex-row justify-end items-center gap-4">
        <label class="label">
            <span class="label-text mx-2">All Regions</span>
            <input type="checkbox" class="toggle" bind:checked={allRegions} />
        </label>
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
        {#if refreshing}
            <div class="w-full h-[21rem] flex flex-row justify-center">
                <span
                    class="my-auto loading loading-dots loading-lg text-secondary"
                />
            </div>
        {:else}
            <InstancesSegment {selectedRegion} bind:allRegions />
        {/if}
        <!-- <StaticIPsSegment /> -->
        <!-- <DomainsSegment /> -->
    </div>
    <div class="flex flex-row gap-2 justify-end">
        <button
            class="btn btn-primary"
            on:click={async () => {
                // await updateRegionResources(selectedRegion, regionResources);
                await refreshData();
            }}
        >
            Referesh
        </button>
        <button
            class="btn btn-primary"
            on:click={async () => {
                // await updateRegionResources(selectedRegion, regionResources);
                console.warn("Crons", $instanceCrons);
            }}
        >
            Cron
        </button>
        <button
            class="btn btn-primary"
            on:click={async () => {
                // await updateRegionResources(selectedRegion, regionResources);
                await downloadAllLogsFromServer();
                // console.warn("Crons", $instanceCrons);
            }}
        >
            Download Logs
        </button>
    </div>
</section>
