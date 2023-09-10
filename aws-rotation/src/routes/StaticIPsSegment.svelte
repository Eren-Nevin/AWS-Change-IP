<script lang="ts">
    import type { StaticIp } from "@aws-sdk/client-lightsail";
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import { detachStaticIp } from "../lib/backend";

    let staticIps = getContext<Writable<StaticIp[]>>("staticIps");
</script>

<div class="flex flex-wrap py-4">
    {#each $staticIps as ip}
        <div class="card w-64 bg-base-100 shadow-xl">
            <div class="card-body">
                <h2 class="card-title">{ip.name}</h2>
                <p>{ip.ipAddress}</p>
                <p>Attached: {ip.attachedTo ?? "Dangling"}</p>
                <div class="card-actions justify-end">
                    <button
                        class="btn btn-primary"
                        on:click={async () => {
                            if (ip.name) {
                                await detachStaticIp(
                                    ip.location?.regionName ?? "",
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
