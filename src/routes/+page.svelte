<Center class="w-full h-full">
    <Group direction="column" class="max-w-md">
        <Text class="font-bold text-[2em] tracking-wide">
            Json Editor 
        </Text>
        <Text size="sm">
            Choose your json file and edit it 
        </Text>
    
        <Button variant='light' color='blue' on:click={handleChooseFile}>
            <Text size='sm'>Choose File</Text>
        </Button>
    </Group>
    <Modal opened={isJsonLoading} centered withCloseButton={false}>
        <Center class="w-full h-full">
            <Text>Loading {jsonName ? `'${jsonName}'` : 'JSON'} please wait...</Text>
            <Loader class="ml-4" />
        </Center>
    </Modal>
    {#if (error)}
        <div class="absolute top-0 left-1/2 -translate-x-1/2">
            <Notification title='Error' icon={getCrossIcon()} color='red'>
                <Text size='sm'>{error}</Text>
            </Notification>
        </div>
    {/if}
</Center>


<script lang="ts">
    import { Center, Text, Button, Group, Modal, Loader, Notification } from '@svelteuidev/core'
	import { jsonNameStore, jsonStore } from '$lib/jsonStore';
	import { goto } from '$app/navigation';
    import { base } from '$app/paths';
    import { Cross2 } from 'radix-icons-svelte';

    let isJsonLoading = false
    let jsonName = ''
    let error = ''

    function getCrossIcon() {
        return Cross2 as any;
    }

    function promisifyFileRead(input: HTMLInputElement) {
        return new Promise<{
            text: string|undefined
            name: string
        }>((resolve, reject) => {
            input.onchange = () => {
                const file = input.files?.[0]
                if (!file) {
                    reject(new Error('No file selected'))
                    return
                }
                try {
                    const reader = new FileReader()
                    reader.onload = () => {
                        const text = reader.result?.toString()
                        resolve({
                            text,
                            name: file.name
                        })
                    }
                    reader.readAsText(file)
                } catch (e) {
                    reject(e)
                }
            }
            input.onerror = () => {
                reject(new Error('Error while reading file'))
            }
        })
    }

    async function handleChooseFile() {
        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = false
        input.accept = '.json'
        const promise = promisifyFileRead(input)
        input.click()
        isJsonLoading = true;
        try {
            const { text, name } = await promise;
            if (!text) return
            const json = JSON.parse(text)
            jsonStore.set(json)
            jsonNameStore.set(name)
            goto(`${base}/editor`)
        } catch(e) {
            if (e instanceof Error) error = e.message
            else error = String(e)
            console.error(e)
            setTimeout(() => {
                error = ''
            }, 2000)
        } finally {
            isJsonLoading = false;
        }
    }
</script>
    
