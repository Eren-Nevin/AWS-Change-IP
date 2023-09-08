<script lang="ts">
    import { writable } from "svelte/store";
    import type { Domain, Instance, StaticIp } from "@aws-sdk/client-lightsail";
    import "../app.postcss";
    import { setContext } from "svelte";

    const instances = writable<Instance[]>([]);
    const staticIps = writable<StaticIp[]>([]);
    const domains = writable<Domain[]>([]);

    setContext("instances", instances);
    setContext("staticIps", staticIps);
    setContext("domains", domains);
</script>

<slot />
