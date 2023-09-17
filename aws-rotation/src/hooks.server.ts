import { RegionName } from "@aws-sdk/client-lightsail";
import { regionHandlersMap, RegionRequestHandler } from "./routes/api/aws_handlers";

console.warn("STARTING")

for (let region of Object.values(RegionName)) {
    if (region == RegionName.US_WEST_1) continue;
    try {
        const handler = new RegionRequestHandler(region)
        await handler.refreshDomains();
        await handler.refreshInstances();
        await handler.refreshStaticIps();
        console.warn(region);
        regionHandlersMap.set(region, handler);
    }
    catch (err) {
        console.error(err);
    }
}
