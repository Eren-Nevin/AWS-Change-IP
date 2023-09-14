<script lang="ts">
    import { writable } from "svelte/store";
    import type { Domain, Instance, StaticIp } from "@aws-sdk/client-lightsail";
    import "../app.postcss";
    import { setContext } from "svelte";
    import type { RegionResources, InstanceCron } from "../lib/models";

    const regionResources = writable<RegionResources[]>([]);
    const domains = writable<Domain[]>([]);
    const constantDomains = writable<Map<string, string>>(new Map());
    const instanceCronMap = writable<Map<string, InstanceCron>>(new Map());

    setContext("resources", regionResources);
    setContext("domains", domains);
    setContext("constantDomains", constantDomains);
    setContext("crons", instanceCronMap);
</script>

<slot />
