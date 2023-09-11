<script lang="ts">
    import type { FixedTimeCron, IntervalCron } from "$lib/models";
    import { getInstanceDomain } from "$lib/utils";
    import type { Domain, Instance } from "@aws-sdk/client-lightsail";
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";

    export let opened = false;

    let cronUseFixedTime = false;

    export let fixedTimes: FixedTimeCron[] = [];
    export let intervalTime: IntervalCron;
    export let instance: Instance;

    let domains = getContext<Writable<Domain[]>>("domains");
    $: connectedDomain = getInstanceDomain(instance, $domains);

    export function open() {
        const modal = document.getElementById("edit_instance_modal");
        if (modal instanceof HTMLDialogElement) {
            opened = true;
            modal.onclose = async () => {
                opened = false;
            };
            modal.showModal();
        }
    }

    export function close() {
        const modal = document.getElementById("edit_instance_modal");
        if (modal instanceof HTMLDialogElement) {
            opened = false;
            modal.close();
        }
    }
</script>

<dialog id="edit_instance_modal" class="modal">
    <form method="dialog" class="modal-box overflow-y-scroll">
        <button
            class="btn btn-sm btn-circle btn-ghost absolute right-4 top-4"
            on:click={() => {}}>✕</button
        >
        <h3 class="font-bold text-lg">{instance.name ?? ""}</h3>
        <!-- Replace this with dropdown -->
        <div class="py-2 flex flex-col gap-2">
            <p>Location: {instance.location?.regionName ?? ""}</p>
            <p>
                IP: {instance.publicIpAddress}
                {instance.isStaticIp ? "(Static)" : "(Not Static)"}
            </p>
            {#if connectedDomain}
                <p>Domain: {connectedDomain.name}</p>
            {:else}
                <p>Domain: Not connected</p>
            {/if}
            <label class="mr-auto label cursor-pointer flex flex-row space-x-2">
                <span class="label-text font-light">Use Fixed Times</span>
                <input
                    type="checkbox"
                    class="toggle toggle-primary"
                    bind:checked={cronUseFixedTime}
                />
            </label>
            {#if !cronUseFixedTime}
                <div class="flex flex-row gap-2 align-middle">
                    <p>Every</p>
                    <input
                        type="number"
                        placeholder="Name"
                        class="input input-sm input-bordered w-full max-w-xs"
                        bind:value={intervalTime.hours}
                    />
                    <span>:</span>
                    <input
                        type="number"
                        placeholder="Name"
                        class="input input-sm input-bordered w-full max-w-xs"
                        bind:value={intervalTime.minutes}
                    />
                </div>
            {:else}
                {#each fixedTimes as fixedTime}
                    <div class="flex flex-row gap-2 align-middle">
                        <p>At</p>
                        <input
                            type="number"
                            placeholder="Name"
                            class="input input-sm input-bordered w-full max-w-xs"
                            bind:value={fixedTime.hour}
                        />
                        <span>:</span>
                        <input
                            type="number"
                            placeholder="Name"
                            class="input input-sm input-bordered w-full max-w-xs"
                            bind:value={fixedTime.minute}
                        />
                        <button
                            on:click|stopPropagation|preventDefault={() => {
                                fixedTimes = fixedTimes.filter(
                                    (time) => time !== fixedTime
                                );
                            }}>✕</button
                        >
                    </div>
                {/each}

                <button
                    class="btn btn-sm btn-primary ml-auto"
                    on:click|stopPropagation|preventDefault={() => {
                        fixedTimes = [...fixedTimes, { hour: 0, minute: 0 }];
                    }}>Add Time</button
                >
            {/if}
            <button class="w-full btn btn-primary mx-auto">Save</button>
        </div>
    </form>

    <form method="dialog" class="modal-backdrop">
        <button>close</button>
    </form>
</dialog>

<style>
    form {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    form::-webkit-scrollbar {
        width: 0;
        height: 0;
    }
</style>
