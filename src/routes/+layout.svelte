
<SvelteUIProvider themeObserver="dark" class="w-full h-full">
    <TypographyProvider class="w-full h-full">
        <div class="bg-zinc-900 w-full h-full border-transparent border overflow-auto">
            <slot></slot>
        </div>
    </TypographyProvider>
</SvelteUIProvider>

<script>
    import { SvelteUIProvider, TypographyProvider, fns } from "@svelteuidev/core";
    import "../app.css";
</script>
