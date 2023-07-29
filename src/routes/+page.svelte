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
</Center>


<script lang="ts">
    import { Center, Text, Button, Group } from '@svelteuidev/core'
	import { jsonNameStore, jsonStore } from '$lib/jsonStore';
	import { goto } from '$app/navigation';

    function promisifyFileRead(input: HTMLInputElement) {
        return new Promise<{
            text: string|undefined
            name: string
        }>((resolve, reject) => {
            input.onchange = () => {
                const file = input.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => {
                    const text = reader.result?.toString()
                    resolve({
                        text,
                        name: file.name
                    })
                }
                reader.readAsText(file)
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
        const { text, name } = await promise;
        if (!text) return
        const json = JSON.parse(text)
        jsonStore.set(json)
        jsonNameStore.set(name)
        goto('/editor')
    }
</script>
    
