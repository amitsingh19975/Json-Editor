<section class="w-full h-full bg-stone-800 border border-zinc-800 rounded flex flex-col shadow-sm shadow-stone-700 overflow-hidden">
    <header class="bg-stone-900 py-3 px-2 border-b border-stone-800 flex flex-col justify-center gap-2 w-full">
        <div class="flex justify-between items-center">
            <span class="text-white text-lg font-semibold">Code Editor</span>
            <div class="flex gap-2">
                <Button variant="subtle" color="green" class="px-3" on:click={onSave} title="Update json" aria-label="Update json">
                    <Check size={18} class="mr-2"/>
                    Save
                </Button>
                <Button variant="subtle" color="red" class="px-3" on:click={() => dispatch('hideEditor')} title="Hide code editor" aria-label="Hide code editor">
                    <Cross1 size={18} class="mr-2" />
                    Close
                </Button>
            </div>
        </div>
    </header>
    <div class="w-full h-full" bind:this={editorRef}></div>
</section>

<script lang="ts">
    import {
	    onDestroy,
        onMount,
        createEventDispatcher
    } from 'svelte';
    import { Button } from '@svelteuidev/core';
    import { Cross1, Check } from 'radix-icons-svelte';

	import type { editor } from 'monaco-editor';
    import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
    import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
	import { isObject } from './utils';
	import { jsonStore } from '$lib/jsonStore';

    export let json: unknown = {};
    export let keyPath: Array<PropertyKey|undefined> = [];
    export let depth = 0;
    
    function getJsonUsingKeyPath(json: unknown, keyPath: Array<PropertyKey|undefined>, depth = 0) {
        let currentJson = json;

        for (let i = 1; i < depth + 1; i++) {
            const key = keyPath[i];
            if (key == null) break;
            if (currentJson == null || !isObject(currentJson)) break;
            currentJson = (currentJson as any)[key];
        }

        return currentJson;
    }

    let content = '';

    $: {
        content = JSON.stringify(getJsonUsingKeyPath(json, keyPath, depth), null, 4);
    }

    let editorRef: HTMLDivElement | undefined;
    let editorInstance: editor.IStandaloneCodeEditor | undefined;

    const dispatch = createEventDispatcher<{ hideEditor: void }>();

    onMount(async() => {
        const monaco = await import('monaco-editor');

        self.MonacoEnvironment = {
            getWorker: function (_workerId: string, label: string): Worker {
                if (label === 'json') {
                    return new jsonWorker();
                }

                return new editorWorker();
            }
        }

        editorInstance = monaco.editor.create(editorRef!, {
            value: content,
            language: 'json',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: {
                enabled: false
            },
            formatOnPaste: true,
            formatOnType: true
        });

        editorInstance.onDidChangeModelContent(() => {
            content = editorInstance?.getValue() ?? '';
        });

        editorInstance.getAction('editor.action.formatDocument')?.run?.();

    });

    onDestroy(() => {
        editorInstance?.dispose();
        editorInstance = undefined;
    })

    function onSave() {
        const parsedJson = JSON.parse(content);
        
        let currentJson = json;
        for (let i = 1; i < depth; i++) {
            const key = keyPath[i];
            if (key == null) break;
            if (currentJson == null || !isObject(currentJson)) break;
            currentJson = (currentJson as any)[key];
        }

        const lastKey = keyPath[depth];

        if (currentJson == null || !isObject(currentJson)) return;

        if (lastKey == null) {
            jsonStore.set(parsedJson);
        } else {
            (currentJson as any)[lastKey] = parsedJson;
            jsonStore.set(json);
        }

        dispatch('hideEditor');
    }

</script>