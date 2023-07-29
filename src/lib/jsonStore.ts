import { writable } from 'svelte/store';

export const jsonStore = writable<unknown>();
export const jsonNameStore = writable<string>();