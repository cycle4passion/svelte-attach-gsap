<script>
	import { toGSAP } from '$lib/index.js';

	const tl = toGSAP.createTimeline();

	let played = $state(false);

	function handleToggle() {
		if (!played) tl.controls.play();
		else tl.controls.reverse();
		played = !played;
	}
</script>

<div class="container">
	<div {@attach toGSAP.to({ rotation: 360 })} class="box">Box 1</div>
	<button type="button" onclick={handleToggle}>{!played ? 'Play' : 'Reverse'}</button>
	<div style="display: flex; gap: 10px;">
		<div {@attach toGSAP.tl.to({ x: 50, y: 110 }, { order: 2, position: '-=0.25' })} class="box">
			Box 2
		</div>
		<div {@attach toGSAP.tl.to({ x: -60 }, { order: 1 })} class="box">Box 3</div>
	</div>
</div>

<style>
	.container {
		display: grid;
		place-items: center;
		height: 100vh;
	}

	.box {
		display: grid;
		place-items: center;
		width: 100px;
		aspect-ratio: 1;
		background: green;
		border-radius: 10px;
		color: white;
	}
</style>
