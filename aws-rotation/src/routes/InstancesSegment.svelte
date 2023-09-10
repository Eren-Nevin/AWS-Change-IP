<script lang="ts">
    import type { Domain, Instance } from "@aws-sdk/client-lightsail";
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import InstanceComponent from "./InstanceComponent.svelte";
    let instances = getContext<Writable<Instance[]>>("instances");
</script>

<div class="flex flex-wrap py-8">
    {#each $instances as instance}
        <div class="card w-96 bg-base-100 shadow-xl">
            <InstanceComponent {instance} />
        </div>
    {/each}
</div>
