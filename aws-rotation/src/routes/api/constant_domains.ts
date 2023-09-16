import fs from 'fs';
import { logger } from './utils';

export let constantDomainsMap = new Map<string, string>();

export async function saveConstantDomainsToFile() {
    const constantDomainsMapJson = JSON.stringify([...constantDomainsMap]);
    await fs.promises.writeFile('./appData/constant_domains.json', constantDomainsMapJson, { encoding: 'utf8' });
    logger.info(`Saved constant domains to file: ${JSON.stringify(Object.fromEntries(constantDomainsMap.entries()))}`);
    return true;

}

export async function loadConstantDomainsFromFile() {
    try {
        const constantDomainsMapJson = await fs.promises.readFile('./appData/constant_domains.json', { encoding: 'utf8' });
        constantDomainsMap = new Map(JSON.parse(constantDomainsMapJson));

        constantDomainsMap = constantDomainsMap;
        logger.info(`Loaded constant domains from file: ${JSON.stringify(Object.fromEntries(constantDomainsMap.entries()))}`);
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}
