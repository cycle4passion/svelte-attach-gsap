# svelte-attach-gsap

A Svelte 5 library that seamlessly integrates a subset of common GSAP animations functionality using Svelte's `@attach` directive. This provides a clean implementation of GSAP in Svelte, similar to how Svelte in/out directives work for simple transitions, or animation directives.

## Features

- 🎬 **Declarative animations** - Use GSAP animations directly in your Svelte templates with `@attach toGSAP`
- ⏱️ **Timeline ordering** - Control animation sequence with optional order parameters
- 🔧 **Subset GSAP API** - Access to `to`, `from`, `fromTo`, `set`
- 📈 **Timeline control** - Create complex animation sequences with `createTimeline()`
- 🧹 **Automatic cleanup** - Animations are automatically cleaned up when components unmount
- 🎯 **Type-safe** - Written in TypeScript with full type support
- 📦 **Exports the `gsap` instance** - For advanced use cases

## See it in Action

[Svelte REPL](https://svelte.dev/playground/92e2a0d7a8d24c22aa6b291d2c88c43d?version=5.39.8)

## Installation

```sh
npm install svelte-attach-gsap gsap
# or
pnpm add svelte-attach-gsap gsap
# or
yarn add svelte-attach-gsap gsap
```

## Before we start

To integrate JS libraries in Svelte, like GSAP, you would add some binding to DOM elements, then use OnMount to initialize...

```ts
<script lang="ts">
  import { onMount } from "svelte";
  import gsap from "gsap";

  let box: HTMLElement;

  onMount(() => {
      gsap.to(box, { rotation: 360 });
  });
</script>

<main>
    <div bind:this={box}>Box</div>
</main>
```

A little cleaner solution would be to write an a svelte action (use:gsap), but actions are on the way out. Svelte 5 has an `@attach` directives. This is the impetus for this package providing GSAP's common animation methods directly in the markup, and Svelte will handle the lifecycle for us.

## Quick Start

### Basic Animations

```ts
<script lang="ts">
  import { toGSAP } from 'svelte-attach-gsap';
</script>

<div {@attach toGSAP.to({ rotation: 360 })}>Box</div>
```

even supporting chaining them together:

```html
<div {@attach toGSAP.from({ opacity: 0, duration: 1 })
                    .to({ delay: 1, rotation: 360 }) }>
  Box
</div>
```

### Timelines with Ordering

Timelines in GSAP are allow for complex control of your animation(s). GSAP native has no need for ordering because the order of animations is determined by the sequence of method calls. Since we are now moving timeline actions to DOM elements, the DOM order quite likely does not match the desired animation order. To address this, `svelte-attach-gsap` introduces an optional `order` parameter in timeline methods.

In GSAP native timelines accept a position parameter which can be a label, absolute time, or relative time. For `svelte-attach-gsap` it has been replaced by an object `{order?: number, position?: string | number}`. Note if DOM order happens to matches animation order, you can omit the order parameter.

```ts
<script lang="ts">
  import { toGSAP } from 'svelte-attach-gsap';
  const tl = toGSAP.createTimeline();
</script>

<div class="container">
  <button onclick={() => tl.controls.play()}>Play Timeline</button>
  
  <div {@attach toGSAP.tl.to({ x: 100 }, { order: 3 })}>DOM #1, Anim #3</div>
  <div {@attach toGSAP.tl.to({ y: 100 }, { order: 1 })}>DOM #2, Anim #1</div>
  <div {@attach toGSAP.tl.to({ rotation: 180 }, { order: 2, position: "-=0.25" })}>DOM #3, Anim #2</div>
</div>
```

In native GSAP the same example is lengthy and adds complexity having to use context to avoid multiple DOM element binding.

```ts
<script lang="ts">
  import { onMount } from "svelte";
  import gsap from "gsap";

  let boxesContainer, tl;

  onMount(() => {
    const ctx = gsap.context((self) => {
      const boxes = self.selector(".box");
      tl = gsap.timeline({ paused: true });
        .to(boxes[1], { y: 100 })
        .to(boxes[0], { x: 100 }, "-=0.25")
        .to(boxes[2], { rotation: 180 })
        .reverse();
    }, boxesContainer); // <- Scope!

    return () => ctx.revert(); // <- Cleanup!
  });
</script>

<main>
  <section class="boxes-container" bind:this={boxesContainer}>
    <button on:click={() => tl.controls.play()}>Play Timeline</button>
    <div class="box">Box 1</div>
    <div class="box">Box 2</div>
    <div class="box">Box 3</div>
  </section>
</main>
```

## Thank You

A big thank you to [GSAP](https://greensock.com/gsap/) for their incredible animation library and to the Svelte team for creating such a powerful framework.

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our GitHub repository.
