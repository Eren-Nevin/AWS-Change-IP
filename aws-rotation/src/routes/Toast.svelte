<script lang="ts">
	import { faCheck } from "@fortawesome/free-solid-svg-icons";
	import { Icon } from "svelte-awesome";

	export let toastType: 'error' | 'success' | 'warning';
	export let message: string;

	const alertTypeClasses: Record<string, string> = {
		error: 'alert-error',
		success: 'alert-success',
		warning: 'alert-warning'
	};
</script>

<div class="alert {alertTypeClasses[toastType]} text-sm flex flex-row mt-auto z-[99999]">
	{#if toastType === 'error'}
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="stroke-current shrink-0 h-6 w-6"
			fill="none"
			viewBox="0 0 24 24"
			><path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
			/></svg
		>
        {:else if toastType === 'success'}
        <Icon 
            data={faCheck}
            scale={1}
            class="text-xs text-white"
        />

	{/if}
	<span>{message}</span>
</div>
