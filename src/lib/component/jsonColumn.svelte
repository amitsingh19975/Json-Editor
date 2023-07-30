<section aria-label="Json column items" class="h-full bg-stone-800 border border-zinc-800 rounded flex flex-col shadow-sm shadow-stone-700 overflow-hidden" bind:this={columnItemRef}>
    <header class="bg-stone-900 py-3 px-2 border-b border-stone-800 flex flex-col justify-center gap-2 w-full" bind:this={headerRef}>
        <div class="flex justify-between items-center">
            <span class="text-stone-400 text-lg mr-2">{normalizeJsonType(jsonType)}</span>
            <div class="flex items-center gap-2">
                <Button variant="subtle" color="green" class="px-3" on:click={() => dispatch('showEditor', {depth, keyPath})} title="Open code editor" aria-label="Open code editor">
                    <Code size={18} />
                </Button>
                {#if (isObject(normalizedJson) || isArray(normalizedJson)) }
                    <Button variant="subtle" class="px-3" on:click={onItemAdd} title="Add item" aria-label="Add json item">
                        <Plus size={18} />
                    </Button>
                {/if}
                <Button color="red" variant="subtle" class="px-3" on:click={() => dispatch('removeColumn', {depth, keyPath})} title="Remove item" aria-label="Remove json item">
                    <Trash size={18} />
                </Button>
                <span class="text-stone-400 text-lg mr-2">{Array.isArray(filteredJsonMeta) ? filteredJsonMeta.length : 1}</span>
            </div>
        </div>
        <div class="grid grid-cols-[1fr_auto] gap-2">
            <Input
                icon={getSearchIcon()}
                placeholder='Search'
                rightSectionWidth={70}
                override={{ rightSection: { pointerEvents: 'none' } }}
                bind:value={patternString}
            />
        </div>
    </header>
    {#if (isFilterEmpty) }
        <div class="flex-1 flex items-center justify-center text-stone-400 text-sm">No match found</div>
    {:else}
        {#if (filteredJsonMeta.length > 1)}
            <div use:clickoutside={{ enabled: true, callback: looseFocus  }}>
                <VirtualList
                    height={listHeight}
                    width="100%"
                    itemCount={filteredJsonMeta.length}
                    itemSize={46}
                    bind:scrollToIndex={scrollToIndex}
                    getKey={(index) => filteredJsonMeta[index].key}>
                    <JsonItem
                        slot="item"
                        let:index
                        let:style
                        style={style}
                        item={filteredJsonMeta[index]}
                        selected={isSelected(filteredJsonMeta[index])}
                        maxSize={filteredJsonMeta.length - 1}
                        tabindex={(tabindex === index) ? 0 : -1}
                        isLastChild={index === filteredJsonMeta.length - 1}
                        on:keydown={onKeyupEvent}
                        on:itemUpdated={onItemUpdate}
                        on:removeItem={onRemoveItem}
                        on:click={onClickItem} />
                </VirtualList>
            </div>
        {:else if (filteredJsonMeta.length === 1)}
            <JsonItem
                item={filteredJsonMeta[0]}
                selected={isSelected(filteredJsonMeta[0])}
                tabindex={0}
                isLastChild={true}
                on:itemUpdated={onItemUpdate}
                on:removeItem={onRemoveItem}
                on:click={onClickItem} />
        {/if}
    {/if}
</section>

<script lang="ts">
    import VirtualList from 'svelte-tiny-virtual-list';
	import JsonItem from './jsonItem.svelte';
	import type { JSONMetaInfo, JSONType } from './types';
	import { getJsonType, isArray, isObject, normalizeJsonType } from './utils';
    import { afterUpdate, createEventDispatcher, onDestroy, onMount, tick } from 'svelte';
    import { Input, Button } from '@svelteuidev/core';
    import { useDebounce, clickoutside } from '@svelteuidev/composables';
    import { MagnifyingGlass, Trash, Plus, Code } from 'radix-icons-svelte';
	import { evalMatchExpr, isErr, parseCommand } from './command';
    import { browser } from '$app/environment';

    const dispatch = createEventDispatcher<{
        clicked: JSONMetaInfo,
        add: {
            depth: number,
            keyPath: Array<PropertyKey|undefined>
        },
        removeItem: {
            depth: number,
            keyPath: Array<PropertyKey|undefined>
            key: PropertyKey
        },
        removeColumn: {
            depth: number
            keyPath: Array<PropertyKey|undefined>
        },
        focusPrevious: void,
        focusNext: void,
        blur: void,
        itemUpdate: {
            oldKey?: PropertyKey,
            key?: PropertyKey,
            value: unknown,
            depth: number,
            type: JSONType,
            keyPath: Array<PropertyKey|undefined>
        },
        showEditor: {
            depth: number,
            keyPath: Array<PropertyKey|undefined>
        }
    }>();


    export let json: unknown;
    export let depth: number;
    export let keyPath: Array<PropertyKey|undefined> = [];
    export let hasFocus = false;

    function onKeyupEvent(event: KeyboardEvent) {
        if (filteredJsonMeta.length < 2) return;
        switch(event.key) {
            case 'ArrowUp':
                event.preventDefault();
                if (scrollToIndex > 0) {
                    scrollToIndex -= 1;
                    dispatch('clicked', filteredJsonMeta[scrollToIndex]);
                }
                break;
            case 'ArrowDown':
                event.preventDefault();
                if (scrollToIndex < filteredJsonMeta.length - 1) {
                    scrollToIndex += 1;
                    dispatch('clicked', filteredJsonMeta[scrollToIndex]);
                }
                break;
            case 'ArrowLeft':
                event.preventDefault();
                dispatch('focusPrevious');
                break;
            case 'ArrowRight':
                event.preventDefault();
                dispatch('focusNext');
                break;
        }
    }
    function documentKeyDownEvent(e: KeyboardEvent) {
        if (!hasFocus) return;
        onKeyupEvent(e);
    }

    onMount(() => {
        if (browser) {
            document.addEventListener('keydown', documentKeyDownEvent);
        }
    })

    onDestroy(() => {
        if (browser) {
            document.removeEventListener('keydown', documentKeyDownEvent);
        }
    });

    function looseFocus() {
        if (hasFocus) dispatch('blur');
    }

    function getSearchIcon() {
        return MagnifyingGlass as any;
    }

    function isSelected(item: JSONMetaInfo): boolean {
        const selectedKey = keyPath[depth + 1];
        if (selectedKey == null || item.key == null) return false;
        return item.key === selectedKey;
    }

    let jsonMeta = [] as Array<JSONMetaInfo> | JSONMetaInfo;
    let filteredJsonMeta = [] as Array<JSONMetaInfo> ;
    let patternString = '';
    let scrollToIndex = 0;
    let tabindex = 0;
    $: {
        const index = filteredJsonMeta.findIndex(item => isSelected(item));
        if (index !== -1) tabindex = index;
        else tabindex = 0;
    }
    $: isFilterEmpty = Array.isArray(filteredJsonMeta) && (filteredJsonMeta.length === 0) && (Array.isArray(jsonMeta) && jsonMeta.length !== 0);

    const debouncedApplyPattern = useDebounce(applyPattern, 1000);

    $: {
        if (patternString) debouncedApplyPattern(patternString);
        else {
            filteredJsonMeta = Array.isArray(jsonMeta) ? jsonMeta : [jsonMeta];
        }
    }

    function defaultCmp(data: JSONMetaInfo, pattern: string | number | boolean | null){
        if (data.type === 'object') {
            return (pattern != null) && !!data.key?.toString().includes(pattern.toString());
        } else if (data.type === 'array') {
            if (data.index === pattern) return true;
            switch(typeof data.value) {
                case 'string': return (pattern != null) && data.value.includes(pattern.toString());
                case 'number':
                case 'boolean':
                    return data.value === pattern;
                case 'object':
                    return data.value === null;
                default:
                    return false;
            }
        } else {
            return data.value === pattern;
        }
    }

    function applyPattern(pattern: string | null | undefined) {
        if (!pattern) return;
        const env = {
            key: (data: JSONMetaInfo) => data.key,
            value: (data: JSONMetaInfo) => data.value,
            type: (data: JSONMetaInfo) => getJsonType(data.value),
            index: (data: JSONMetaInfo) => data.index,
        };
        const expr = parseCommand(pattern);

        if (Array.isArray(jsonMeta)) {
            filteredJsonMeta = jsonMeta.filter(item => {
                const res = evalMatchExpr(expr, item, env, defaultCmp);
                return isErr(res) || res.value;
            });
        } else {
            const res = evalMatchExpr(expr, jsonMeta, env, defaultCmp);
            if (isErr(res) || res.value) filteredJsonMeta = [jsonMeta];
            else filteredJsonMeta = [];
        }
    }

    function normalizeJsonObject(json: unknown, size: number, keys: Array<PropertyKey|undefined>): unknown {
        if (!json) return null;
        if (keys.length === 0) return json;
        let item = json;
        for (let i = 1; i < size; ++i) {
            const key = keys[i]!;
            if (!isObject(item) || item == null) break;
            item = (item as any)[key];
        }
        return item;
    }

    $: normalizedJson = normalizeJsonObject(json, depth + 1, keyPath);
    $: jsonType = getJsonType(normalizedJson);

    $: {
        const tempJson = normalizedJson;
        jsonMeta = [];
        if (typeof tempJson === 'object' && tempJson !== null) {
            if (Array.isArray(tempJson)) {
                jsonMeta = tempJson.map((value, index): JSONMetaInfo => ({
                    type: 'array',
                    key: index,
                    value,
                    index
                }));
            } else {
                jsonMeta = Object.entries(tempJson).map(([key, value], index) => ({
                    type: 'object',
                    key,
                    value ,
                    index
                }));
            }
        } else {
            jsonMeta = {
                type: getJsonType(tempJson) as any,
                value: tempJson,
                index: 0
            }
        }
    }

    function onClickItem(e: CustomEvent<JSONMetaInfo>) {
        dispatch('clicked', e.detail);
    }

    function onItemUpdate(e: CustomEvent<{ key?: JSONMetaInfo['key'], value: unknown, type: JSONType, oldKey?: JSONMetaInfo['key'] }>) {
        dispatch('itemUpdate', {
            oldKey: e.detail.oldKey,
            key: e.detail.key,
            value: e.detail.value,
            type: e.detail.type,
            depth: depth,
            keyPath
        })
    }

    function onRemoveItem(e: CustomEvent<JSONMetaInfo>) {
        const key = e.detail.key;
        if (key == null) return;
        dispatch('removeItem', {
            key,
            depth,
            keyPath
        })
    }

    let columnItemRef: HTMLElement;
    let headerRef: HTMLElement;

    function calculateListHeight(parentView: HTMLElement|undefined, headerView: HTMLElement|undefined) {
        if (!parentView || !headerView) return 500;
        const headerHeight = headerView.getBoundingClientRect().height;
        const totalHeight = parentView.getBoundingClientRect().height;
        return totalHeight - headerHeight - 4;
    }

    $: listHeight = calculateListHeight(columnItemRef, headerRef);

    function focusCurrentColumn() {
        if (!columnItemRef) return;
        columnItemRef.scrollIntoView({
            behavior: 'instant',
            block: 'nearest',
            inline: 'start',
        });
    }

    afterUpdate(() => {
        if (hasFocus) focusCurrentColumn();
    })

    async function onItemAdd() {
        patternString = '';
        dispatch('add', { depth, keyPath });
    }
    
</script>