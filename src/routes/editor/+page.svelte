<AppShell>
    <Header slot="header" height="4rem">
        <div class="h-full px-4 w-full flex items-center justify-between">
            <div class="flex flex-grow">
                <Anchor href={base}>
                    <Text size="xl" weight="bold">
                        <span class="text-sky-400">Json Editor</span>
                    </Text>
                </Anchor>
            </div>
            <div class="flex gap-2">
                <Button variant="outline" color="yellow" on:click={onDownloadJson}>
                    <Download class="w-5 h-5 mr-2" />
                    Download
                </Button>
                <Button variant="outline" color="white" on:click={onCopy}>
                    <ClipboardCopy class="w-5 h-5 mr-2" />
                    Copy
                </Button>
            </div>
        </div>
    </Header>
    <ShellSection grow className="h-[90vh] w-full">
        <JsonView />
    </ShellSection>
</AppShell>
{#if isCopied}
    <div class="absolute top-0 left-1/2 -translate-x-1/2">
        <Notification title='JSON Copied' icon={getCheckIcon()} color='teal'>
            <Text size='sm'>JSON copied to clipboard</Text>
        </Notification>
    </div>
{/if}

<script lang="ts">
    import { AppShell, Header, ShellSection, Text, Anchor, Button, Notification } from '@svelteuidev/core';
    import JsonView from '$lib/component/jsonView.svelte';
    import { Download, ClipboardCopy, Check } from 'radix-icons-svelte';
	import { jsonNameStore, jsonStore } from '$lib/jsonStore';
    import { base } from '$app/paths';
    
    $: jsonName = $jsonNameStore;
    $: json = $jsonStore;

    let isCopied: boolean = false;

    function onDownloadJson() {
        const a = document.createElement('a');
        const file = new Blob([JSON.stringify(json)], { type: 'application/json' });
        a.href = URL.createObjectURL(file);
        a.download = jsonName;
        a.click();
    }

    function getCheckIcon() {
        return Check as any;
    }

    async function onCopy() {
        if (('clipboard' in navigator) === false) return;
        await navigator.clipboard.writeText(JSON.stringify(json));
        isCopied = true;
        setTimeout(() => {
            isCopied = false;
        }, 2000);
    }

</script>