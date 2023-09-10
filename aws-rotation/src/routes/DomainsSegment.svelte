<script lang="ts">
    import type { Domain } from "@aws-sdk/client-lightsail";
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import { getDomainPointedIp } from "../lib/utils";
    import { deleteDomainIPs, pointDomainToIP } from "../lib/backend";

    let domains = getContext<Writable<Domain[]>>("domains");
</script>

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
                                    domain.location?.regionName ?? "",
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
                                    domain.location?.regionName ?? "",
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
