{#if (editMode)}
    <div class="flex items-center justify-center w-full px-1" style={style} use:clickoutside={{ enabled: true, callback: onClickOutside }}>
        <input
            type="text"
            class="flex-grow p-2 border rounded border-zinc-500 bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            value={getInputValue(item)}
            on:input={onInputValueUpdate}
            on:keyup|preventDefault={handleKeyUp}
            bind:this={inputRef}
        />
    </div>
{:else}
    {#if (item.type === 'object' || item.type === 'array')}
        <Tooltip label={getTitle(item)} class="w-full" color="cyan" openDelay={1000} style={style}>
            <button
                class="item-btn flex flex-row justify-between items-center w-full p-2 border-t border-zinc-700 cursor-pointer gap-1 hover:bg-zinc-700 text-stone-50 group h-[3rem]"
                class:border-b={isLastChild}
                title={getTitle(item)}
                aria-label={getTitle(item)}
                data-selected={selected}
                on:click|preventDefault={onClickItem}
                on:keyup
                on:keydown
                {tabindex}
            >
                <div class="text-ellipsis whitespace-nowrap overflow-hidden flex-grow text-start">
                    {#if (item.type === 'object')}
                        <span>{item.key}</span>
                    {:else if (item.type === 'array')}
                        <div class="flex gap-2">
                            <span class="whitespace-pre font-mono opacity-50">[{item.key?.toString().padStart(indexWithPadding, ' ')}]</span>
                            {#if (jsonType === 'object')}
                                <span>{'{...}'}</span>
                            {:else if (jsonType === 'array')}
                                <span>[...]</span>
                            {:else}
                                {#if (jsonType === 'string')}
                                    <div class="flex text-yellow-500">
                                        <span class="opacity-50">"</span>
                                        <span class="font-bold">{itemValue}</span>
                                        <span class="opacity-50">"</span>
                                    </div>
                                {:else}
                                    <span class="{getValueClass(itemValue)}">{JSON.stringify(itemValue)}</span>
                                {/if}
                            {/if}
                        </div>
                    {/if}
                </div>
                <div class="flex gap-1 items-center" >
                    <UnstyledButton
                        class="p-2 bg-sky-200 rounded-full group-hover:block hidden active:bg-sky-300 transition-colors"
                        title="Edit"
                        aria-label="Edit key or Value"
                        on:click={handleEditClick}
                    >
                        <Pencil color="black" />
                    </UnstyledButton>
                    <UnstyledButton
                        class="p-2 bg-rose-200 rounded-full group-hover:block hidden active:bg-rose-300 transition-colors"
                        title="Delete"
                        aria-label="Remove key"
                        on:click={handleDeleteClick}
                    >
                        <Trash color="red" />
                    </UnstyledButton>
                    <span class="group-hover:hidden block opacity-50">{normalizeJsonType(jsonType)}</span>
                    <ChevronRight />
                </div>
            </button>
        </Tooltip>
    {:else}
        <div style={style} class="p-2 flex flex-col gap-5">
            <NativeSelect data={jsonTypeSelectType} 
                placeholder="Select JSON value type"
                label="Json Type"
                bind:value={currentJsonValueType}
            />
            {#if (currentJsonValueType === 'string')}
                <InputWrapper label="Json String">
                    <Input
                        placeholder="Enter Json Value"
                        multiline
                        root="textarea"
                        value={itemValue}
                        rows={5}
                        resize="vertical"
                        class="border rounded !border-zinc-500 !bg-zinc-900"
                        on:input={updateValue}
                        />
                </InputWrapper>
            {:else if (currentJsonValueType === 'number')}
                <NumberInput
                    label="Json Number"
                    value={Number(itemValue)}
                    on:change={updateValue}
                    placeholder="Enter Json Value"
                ></NumberInput>
            {:else if (currentJsonValueType === 'boolean')}
                    <RadioGroup items={[{ label: 'True', value: 'true' }, { label: 'False', value: 'false' }]}
                        direction="column"
                        labelDirection="left"
                        color="cyan"
                        label="Json Boolean"
                        spacing="md"
                        value={itemValue ? 'true' : 'false'}
                        on:change={updateValue}
                    />
            {/if}
            <Button fullSize variant="gradient" style="min-height: 2.5rem" on:click={saveItem}>Save</Button>
        </div>
    {/if}
{/if}

<script lang="ts">
	import { afterUpdate, createEventDispatcher, onMount } from 'svelte';
	import type { JSONMetaInfo, JSONType } from './types';
	import { getJsonType, normalizeJsonType } from './utils';
    import { Tooltip, UnstyledButton, InputWrapper, Input, RadioGroup, NativeSelect, Button, type SelectItem, NumberInput } from '@svelteuidev/core';
    import { ChevronRight, Trash, Pencil1 as Pencil } from 'radix-icons-svelte';
    import { clickoutside, useDebounce } from '@svelteuidev/composables';

    const jsonTypeSelectType: SelectItem[] = [
        { label: 'String', value: 'string' },
        { label: 'Number', value: 'number' },
        { label: 'Boolean', value: 'boolean' },
        { label: 'Null', value: 'null' },
        { label: 'Object', value: 'object' },
        { label: 'Array', value: 'array' },
    ];

    const dispatch = createEventDispatcher<{
        itemUpdated: {
            oldKey?: PropertyKey,
            key?: PropertyKey,
            type: JSONType,
            value: unknown,
        },
        removeItem: JSONMetaInfo,
        click: JSONMetaInfo,
    }>();

    export let item: JSONMetaInfo;
    export let selected: boolean = false;
    export let editMode: boolean = false;
    export let maxSize: number = 9;
    export let style = ''
    export let isLastChild = false;
    export let tabindex = -1;

    let inputRef: HTMLInputElement | undefined;

    let itemValue = item.value;

    $: {
        itemValue = item.value;
    }

    $: jsonType = getJsonType(itemValue);

    let currentJsonValueType = jsonType;

    $: {
        currentJsonValueType = jsonType;
    }

    let newItemKey = item.key;

    onMount(() => {
        newItemKey = item.key;
    })

    function countDigits(num: number): number {
        let count = 0;
        while (num > 0) {
            num = Math.floor(num / 10);
            count++;
        }
        return count;
    }

    $: indexWithPadding = countDigits(maxSize);

    function onClickItem() {
        dispatch('click', item);
    }

    function getTitle(item: JSONMetaInfo): string {
        if (item.type === 'object') {
            return item.key?.toString() ?? '';
        }
        if (item.type === 'array') {
            return `Array[${item.key?.toString() ?? '?'}]`;
        }
        return '';
    }

    function getValueClass(value: unknown) {
        if (value == null) return 'text-fuchsia-800 font-bold';
        switch(typeof value) {
            case 'boolean': return 'text-sky-500 font-bold';
            default: return '';
        }
    }

    function handleEditClick(e: Event) {
        e.stopPropagation();
        e.preventDefault();
        if (item.type === 'object') {
            editMode = true;
        } else if (item.type === 'array') {
            switch(typeof itemValue) {
                case 'string': case 'boolean': case 'number':
                    editMode = true;
                    break;
                default: {
                    if (itemValue == null) {
                        editMode = true;
                    }
                }
            }
        }
    }

    function getInputValue(item: JSONMetaInfo): string {
        if (item.type === 'object') {
            return newItemKey?.toString() ?? '';
        }
        if (item.type === 'array') {
            return JSON.stringify(item.value);
        }
        return '';
    }

    function updateInputValue(e: { currentTarget: HTMLInputElement } | InputEvent) {
        let value = '';
        if (e instanceof InputEvent) {
            const el = e.target as HTMLInputElement;
            value = el.value;
        } else {
            value = e.currentTarget.value;
        }
        
        if (item.type === 'object') {
            newItemKey = value;
        }
        if (item.type === 'array') {
            itemValue = JSON.parse(value);
        }
    }

    const onInputValueUpdate = useDebounce(updateInputValue, 500);

    function handleKeyUp(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            updateInputValue({ currentTarget: e.currentTarget as HTMLInputElement });
            onClickOutside();
        }
    }

    function onClickOutside() {
        editMode = false;
        const payload = {
            oldKey: item.key,
            key: newItemKey,
            type: getJsonType(itemValue),
            value: itemValue,
        };
        dispatch('itemUpdated', payload);
    }

    function handleDeleteClick(e: CustomEvent) {
        e.stopPropagation();
        dispatch('removeItem', item);
    }

    function updateValue(e: CustomEvent<unknown> | InputEvent) {
        let value: unknown = null;
        if (e instanceof InputEvent) {
            const el = e.currentTarget as HTMLInputElement;
            value = el.value;
        } else if (e instanceof CustomEvent) {
            value = e.detail;
        }
        switch(currentJsonValueType) {
            case 'boolean': {
                itemValue = value === 'true';
                break;
            }
            case 'number': {
                itemValue = Number(value);
                break;
            }
            case 'string': {
                itemValue = value;
                break;
            }
            case 'null': {
                itemValue = null;
                break;
            }
            default: {
                itemValue = value;
            }
        }
    }

    function saveItem() {
        let value = itemValue;
        const type = getJsonType(itemValue);
        if (currentJsonValueType !== type) {
            if (currentJsonValueType === 'number') {
                value = Number(value);
            } else if (currentJsonValueType === 'boolean') {
                if (type === 'string') value = (value === 'true');
                else value = Boolean(value);
            } else if (currentJsonValueType === 'null') {
                value = null;
            } else if (currentJsonValueType === 'string') {
                value = value?.toString() ?? '';
            } else if (currentJsonValueType === 'object') {
                value = {};
            } else if (currentJsonValueType === 'array') {
                value = [];
            }
        }
        
        dispatch('itemUpdated', {
            type: currentJsonValueType,
            value,
            key: item.key,
        });
        editMode = false;
    }

    afterUpdate(() => {
        if (!editMode) return;
        inputRef?.focus();
    })

</script>

<style lang="postcss" scoped>
    .item-btn[data-selected="true"] {
        @apply bg-zinc-700;
    }
</style>
