
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
                                        selectedRegion,
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
                                        selectedRegion,
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
