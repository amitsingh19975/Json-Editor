<div class="grid grid-rows-[auto_1fr] overflow-hidden h-full gap-3">
    <nav aria-label="Json navigation" class="w-full overflow-hidden">
        <Center>
            <div class="bg-zinc-800 border border-zinc-700 rounded-full px-4 py-1 overflow-hidden">
                <Breadcrumbs class="overflow-x-auto no-scrollbar" bind:element={breadcrumbsRef}>
                    <Breadcrumbs.Item>
                        <Anchor>
                            <Home class="w-4 h-4" />
                        </Anchor>
                    </Breadcrumbs.Item>
                    {#each keyPath as key, index (`${key?.toString()}-${index}`)}
                        {#if (index > 0) && (showEditor ? index <= editorViewJsonDepth : true)}
                            <Breadcrumbs.Item>
                                <Anchor>
                                    <span class="text-white">{key}</span>
                                </Anchor>
                            </Breadcrumbs.Item>
                        {/if}
                    {/each}
                </Breadcrumbs>
            </div>
        </Center>
    </nav>
    <section
        aria-label="json explorer"
        class="grid grid-flow-col grid-rows-1 w-full overflow-x-auto justify-start" style="grid-auto-columns: {showEditor ? '1fr' : '25rem'};"
        bind:this={itemContainerRef}
    >
        {#if !showEditor}
            {#each keyPath as key, index (`${key?.toString()}-${index}`)}
                <JsonColumn
                    json={json}
                    depth={index}
                    keyPath={keyPath}
                    hasFocus={focusedColumnIndex === index}
                    on:blur={() => focusedColumnIndex = -1}
                    on:focusNext={focusNext}
                    on:focusPrevious={focusPrevious}
                    on:clicked={(e) => handleClick(e, index + 1)}
                    on:itemUpdate={onItemUpdate}
                    on:add={onItemAdd}
                    on:removeColumn={onItemColumnRemove}
                    on:removeItem={onItemRemove}
                    on:showEditor={onShowEditor}
                />
            {/each}
        {:else}
            <EditorView {json} {keyPath} depth={editorViewJsonDepth} on:hideEditor={onHideEditor}></EditorView>
        {/if}
    </section>
</div>

<script lang="ts">
    import { jsonStore } from '$lib/jsonStore';
    import { Anchor, Breadcrumbs, Center } from '@svelteuidev/core';
    import { Home } from 'radix-icons-svelte';
	import { afterUpdate } from 'svelte';
    import JsonColumn from './jsonColumn.svelte';
	import type { JSONMetaInfo, JSONType } from './types';
	import { deepClone, isObject } from './utils';
    import EditorView from './editorView.svelte';
    
    $: json = $jsonStore
    
    let keyPath = [undefined] as (PropertyKey | undefined)[]

    let breadcrumbsRef: HTMLDivElement | undefined;
    let itemContainerRef: HTMLElement | undefined;
    let focusedColumnIndex = -1;
    let showEditor = false;
    let editorViewJsonDepth = 0;

    afterUpdate(() => {
        if (!breadcrumbsRef) return;
        breadcrumbsRef.scrollLeft = breadcrumbsRef.scrollWidth
    })

    afterUpdate(() => {
        if (itemContainerRef != null && keyPath.length !== 0) {
            itemContainerRef.scrollLeft = itemContainerRef.scrollWidth
        }
    })

    function focusNext() {
        focusedColumnIndex = Math.min(focusedColumnIndex + 1, keyPath.length - 1)
    }

    function focusPrevious() {
        focusedColumnIndex = Math.max(focusedColumnIndex - 1, 0)
    }

    async function handleClick(event: CustomEvent<JSONMetaInfo>, index: number) {
        focusedColumnIndex = index - 1

        const data = event.detail
        const key = data.key
        keyPath.splice(index, keyPath.length)
        if (key == null) return;
        keyPath.push(key)
        keyPath = keyPath
    }

    function getSecondLastObject(obj: unknown, depth: number, keypath: typeof keyPath): [unknown, PropertyKey | undefined] {
        let current = obj;
        for (let i = 1; i < depth; i++) {
            const tempKey = keypath[i];
            if (tempKey == null || !isObject(current)) break;
            current = current[tempKey]
        }
        const lastKey = keypath[depth];
        return [current, lastKey]
    }

    function renameKey(obj: unknown, oldKey: PropertyKey | undefined, newKey: PropertyKey | undefined) {
        if (!isObject(obj) || oldKey === newKey || (oldKey == null) || (newKey == null)) return;
        if (!(oldKey in obj)) {
            obj[newKey] = obj[oldKey];
            return;
        }
        Object.defineProperty(obj, newKey, Object.getOwnPropertyDescriptor(obj, oldKey)!)
        delete obj[oldKey];
    }

    function onItemUpdate(
        event: CustomEvent<{
            oldKey?: JSONMetaInfo['key'],
            key?: JSONMetaInfo['key'],
            type: JSONType,
            value: unknown,
            depth: number,
            keyPath: typeof keyPath
        }>
    ) {
        const data = event.detail
        const path = data.keyPath;
        const key = data.key;
        const value = deepClone(data.value);
        const depth = data.depth;
        const oldItemKey = data.oldKey;

        const [current, lastKey] = getSecondLastObject(json, depth, path);

        if (!isObject(current)) return;

        if (lastKey == null) {
            if (key == null) {
                jsonStore.set(value)
            } else {
                const temp = current[key]
                if (Array.isArray(temp)) {
                    temp.push(value)
                } else {
                    renameKey(current, oldItemKey, key)
                }
            }
        } else {
            if (key == null) {
                current[lastKey] = value;
            } else {
                const temp = current[lastKey]
                if (Array.isArray(temp)) {
                    temp.splice(Number(key), 1, value)
                } else if (isObject(temp)) {
                    renameKey(temp, oldItemKey, key)
                }
            }
        }
        

        jsonStore.set(json)
    }

    function onItemColumnRemove(e: CustomEvent<{ depth: number, keyPath: typeof keyPath }>) {
        const data = e.detail
        const depth = data.depth;
        const path = data.keyPath;
        if (depth === 0) {
            jsonStore.set({})
            keyPath = [undefined]
            return;
        }

        const [current, lastKey] = getSecondLastObject(json, depth, path);

        if (lastKey == null || !isObject(current)) return;
        if (Array.isArray(current)) {
            current.splice(Number(lastKey), 1)
        } else {
            delete current[lastKey]
        }

        keyPath.splice(depth, keyPath.length)

        jsonStore.set(json)
    }

    function generateUniqueKey(current: Record<PropertyKey, unknown>, prefix = 'Temporary Key') {
        let i = 0; 
        let tempKey = prefix
        while (tempKey in current) {
            tempKey = `${prefix} ${i}`;
            i++;
        }
        return tempKey
    }

    function onItemAdd(e: CustomEvent<{ depth: number, keyPath: typeof keyPath }>) {
        const data = e.detail
        const depth = data.depth;
        const path = data.keyPath;

        const [current, lastKey] = getSecondLastObject(json, depth, path);

        if (!isObject(current)) return;

        if (lastKey == null) {
            if (Array.isArray(current)) {
                current.push(null)
            } else {
                const tempKey = generateUniqueKey(current)
                current[tempKey] = null
            }
        } else {
            const lastEl = current[lastKey]
            if (Array.isArray(lastEl)) {
                lastEl.push(null)
            } else if (isObject(lastEl)) {
                const tempKey = generateUniqueKey(lastEl)
                lastEl[tempKey] = ''
            }
        }

        jsonStore.set(json)

    }

    function onItemRemove(e: CustomEvent<{ key: PropertyKey, depth: number, keyPath: typeof keyPath }>) {
        const data = e.detail
        const depth = data.depth;
        const path = data.keyPath;

        const [current, lastKey] = getSecondLastObject(json, depth, path);

        if (!isObject(current)) return;
        if (lastKey == null) {
            if (Array.isArray(current)) {
                current.splice(Number(data.key), 1)
            } else {
                delete current[data.key]
            }
        } else {
            const lastEl = current[lastKey]
            if (Array.isArray(lastEl)) {
                lastEl.splice(Number(data.key), 1)
            } else if (isObject(lastEl)) {
                delete lastEl[data.key]
            }
        }

        jsonStore.set(json)
    }

    function onShowEditor(e: CustomEvent<{ depth: number, keyPath: typeof keyPath }>) {
        const data = e.detail
        editorViewJsonDepth = data.depth
        showEditor = true
    }

    function onHideEditor() {
        showEditor = false
    }

    
</script>

<style lang="postcss">
    
</style>