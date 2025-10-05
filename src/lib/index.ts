import { gsap } from 'gsap';

// GSAP callback types
type GSAPCallback = () => void;
type GSAPCallbackWithProgress = (progress?: number) => void;
type GSAPCallbackWithTarget = (target?: gsap.TweenTarget) => void;
type GSAPGenericCallback = (...args: unknown[]) => void;
type GSAPEventCallback =
	| GSAPCallback
	| GSAPCallbackWithProgress
	| GSAPCallbackWithTarget
	| GSAPGenericCallback;

// Timeline method parameter types
type TimelineChild = gsap.core.Tween | gsap.core.Timeline | GSAPCallback;
type TweenTarget = gsap.TweenTarget;
type CallbackParams = unknown[];
type CallbackScope = object;

interface AttachFunction {
	animations: Animation[];
	to: (vars: object, position?: string, order?: number) => AttachFunction;
	from: (vars: object, position?: string, order?: number) => AttachFunction;
	fromTo: (fromVars: object, toVars: object, position?: string, order?: number) => AttachFunction;
	set: (vars: object, position?: string, order?: number) => AttachFunction;
	(element: Element): () => void;
}

// Core interfaces for better type safety
interface Animation {
	method: (...args: unknown[]) => gsap.core.Tween;
	args: unknown[];
	order?: number;
}

interface TweenData {
	gsapMethod: (...args: unknown[]) => gsap.core.Tween;
	element: Element;
	args: unknown[];
	position?: string | number;
	order?: number;
	id: number;
}

// Base animation store for managing animations and cleanup
class AnimationStore<T = unknown> {
	protected store: T[] = [];
	protected nextId = 0;

	generateId(): number {
		return this.nextId++;
	}

	addToStore(item: T): void {
		this.store.push(item);
	}

	removeFromStore(predicate: (item: T) => boolean): boolean {
		const index = this.store.findIndex(predicate);
		if (index !== -1) {
			this.store.splice(index, 1);
			return true;
		}
		return false;
	}

	clearStore(): void {
		this.store.length = 0;
	}

	protected getStore(): T[] {
		return this.store;
	}

	get storeSize(): number {
		return this.store.length;
	}
}

// Utilities for handling Timeline position and order parameters
class TimelineUtils {
	static calculateEffectiveOrder(
		item: { order?: number; id: number },
		maxExplicitOrder: number
	): number {
		if (item.order !== undefined) {
			return item.order;
		}
		const startingOrderForUnordered = maxExplicitOrder === -Infinity ? 0 : maxExplicitOrder + 1;
		return startingOrderForUnordered + item.id;
	}

	// Add this method to TimelineUtils class
	static parseTimelineOptions(
		positionOrOptions?: string | number | { position?: string | number; order?: number },
		order?: number
	): { position?: string | number; order?: number } {
		if (typeof positionOrOptions === 'object' && positionOrOptions !== null) {
			return {
				position: positionOrOptions.position,
				order: positionOrOptions.order
			};
		}
		return {
			position: positionOrOptions,
			order: order
		};
	}
}

// Factory for creating chainable methods
class ChainableMethodFactory {
	static createMethod(
		gsapMethod: (...args: unknown[]) => gsap.core.Tween,
		methodName: string,
		paramHandler?: (args: unknown[]) => { args: unknown[]; order?: number }
	) {
		return function (this: AttachFunction, ...args: unknown[]) {
			const processed = paramHandler ? paramHandler(args) : { args };
			this.animations.push({
				method: gsapMethod,
				args: processed.args,
				...(processed.order !== undefined && { order: processed.order })
			});
			return this;
		};
	}

	// Standard chainable methods (no order support)
	static addStandardMethods(attachFunction: AttachFunction): void {
		attachFunction.to = ChainableMethodFactory.createMethod(
			gsap.to as (...args: unknown[]) => gsap.core.Tween,
			'to'
		);
		attachFunction.from = ChainableMethodFactory.createMethod(
			gsap.from as (...args: unknown[]) => gsap.core.Tween,
			'from'
		);
		attachFunction.fromTo = ChainableMethodFactory.createMethod(
			gsap.fromTo as (...args: unknown[]) => gsap.core.Tween,
			'fromTo'
		);
		attachFunction.set = ChainableMethodFactory.createMethod(
			gsap.set as (...args: unknown[]) => gsap.core.Tween,
			'set'
		);
	}

	// Timeline chainable methods (with order support)
	static addTimelineMethods(attachFunction: AttachFunction): void {
		attachFunction.to = function (
			vars: object,
			positionOrOptions?: string | number | { position?: string | number; order?: number },
			order?: number
		) {
			const { position, order: finalOrder } = TimelineUtils.parseTimelineOptions(
				positionOrOptions,
				order
			);

			this.animations.push({
				method: gsap.to as (...args: unknown[]) => gsap.core.Tween,
				args: [vars, position],
				...(finalOrder !== undefined && { order: finalOrder })
			});
			return this;
		};

		attachFunction.from = function (
			vars: object,
			positionOrOptions?: string | number | { position?: string | number; order?: number },
			order?: number
		) {
			const { position, order: finalOrder } = TimelineUtils.parseTimelineOptions(
				positionOrOptions,
				order
			);

			this.animations.push({
				method: gsap.from as (...args: unknown[]) => gsap.core.Tween,
				args: [vars, position],
				...(finalOrder !== undefined && { order: finalOrder })
			});
			return this;
		};

		attachFunction.fromTo = function (
			fromVars: object,
			toVars: object,
			positionOrOptions?: string | number | { position?: string | number; order?: number },
			order?: number
		) {
			const { position, order: finalOrder } = TimelineUtils.parseTimelineOptions(
				positionOrOptions,
				order
			);

			this.animations.push({
				method: gsap.fromTo as (...args: unknown[]) => gsap.core.Tween,
				args: [fromVars, toVars, position],
				...(finalOrder !== undefined && { order: finalOrder })
			});
			return this;
		};

		attachFunction.set = function (
			vars: object,
			positionOrOptions?: string | number | { position?: string | number; order?: number },
			order?: number
		) {
			const { position, order: finalOrder } = TimelineUtils.parseTimelineOptions(
				positionOrOptions,
				order
			);

			this.animations.push({
				method: gsap.set as (...args: unknown[]) => gsap.core.Tween,
				args: [vars, position],
				...(finalOrder !== undefined && { order: finalOrder })
			});
			return this;
		};
	}
}

// GSAP proxy class that provides full GSAP API with TypeScript support and chainability
class ToGSAP {
	private static instance: ToGSAP | null = null;
	private timelineRegistry = new Map<string, TimelineGSAP>();

	// Common timeline properties - add more as needed
	tl!: TimelineGSAP;

	static getInstance(): ToGSAP {
		if (!ToGSAP.instance) {
			ToGSAP.instance = new ToGSAP();
		}
		return ToGSAP.instance;
	}

	// Method to register a timeline with a name
	registerTimeline(name: string, timeline: Timeline): void {
		this.timelineRegistry.set(name, timeline.toGSAP);
		// Also add as a property for direct access
		Object.defineProperty(this, name, {
			value: timeline.toGSAP,
			writable: true,
			enumerable: true,
			configurable: true
		});
	}

	// Method to create and register a timeline
	createTimeline(name = 'tl', ...args: unknown[]): Timeline {
		const timeline = new Timeline(...args);
		this.registerTimeline(name, timeline);
		return timeline;
	}

	// Core animation methods - these should accept only the animation vars for {@attach} usage
	to(vars: gsap.TweenVars, position?: gsap.Position) {
		return this.createChainableAttach(
			'to',
			[vars, position].filter((arg) => arg !== undefined)
		);
	}

	from(vars: gsap.TweenVars, position?: gsap.Position) {
		return this.createChainableAttach(
			'from',
			[vars, position].filter((arg) => arg !== undefined)
		);
	}

	fromTo(fromVars: gsap.TweenVars, toVars: gsap.TweenVars, position?: gsap.Position) {
		return this.createChainableAttach(
			'fromTo',
			[fromVars, toVars, position].filter((arg) => arg !== undefined)
		);
	}

	set(vars: gsap.TweenVars) {
		return this.createChainableAttach('set', [vars]);
	}

	// Timeline methods
	timeline(...args: Parameters<typeof gsap.timeline>) {
		return gsap.timeline(...args);
	}

	// Context methods
	context(...args: Parameters<typeof gsap.context>) {
		return gsap.context(...args);
	}

	// Utility methods with proper typing
	quickSetter(...args: Parameters<typeof gsap.quickSetter>) {
		return gsap.quickSetter(...args);
	}

	quickTo(...args: Parameters<typeof gsap.quickTo>) {
		return gsap.quickTo(...args);
	}

	// Static methods
	registerPlugin(...args: Parameters<typeof gsap.registerPlugin>) {
		return gsap.registerPlugin(...args);
	}

	registerEffect(...args: Parameters<typeof gsap.registerEffect>) {
		return gsap.registerEffect(...args);
	}

	// Getters/Setters
	get effects() {
		return gsap.effects;
	}

	get version() {
		return gsap.version;
	}

	get ticker() {
		return gsap.ticker;
	}

	get config() {
		return gsap.config;
	}

	get globalTimeline() {
		return gsap.globalTimeline;
	}

	// Utility methods
	getProperty(...args: Parameters<typeof gsap.getProperty>) {
		return gsap.getProperty(...args);
	}

	getTweensOf(...args: Parameters<typeof gsap.getTweensOf>) {
		return gsap.getTweensOf(...args);
	}

	isTweening(...args: Parameters<typeof gsap.isTweening>) {
		return gsap.isTweening(...args);
	}

	killTweensOf(...args: Parameters<typeof gsap.killTweensOf>) {
		return gsap.killTweensOf(...args);
	}

	// Configuration methods
	defaults(...args: Parameters<typeof gsap.defaults>) {
		return gsap.defaults(...args);
	}

	// Export methods
	exportRoot(...args: Parameters<typeof gsap.exportRoot>) {
		return gsap.exportRoot(...args);
	}

	// Parse methods
	parseEase(...args: Parameters<typeof gsap.parseEase>) {
		return gsap.parseEase(...args);
	}

	// Advanced methods
	delayedCall(...args: Parameters<typeof gsap.delayedCall>) {
		return gsap.delayedCall(...args);
	}

	// Create chainable attach function
	private createChainableAttach(methodName: keyof typeof gsap, args: unknown[]) {
		const attachFunction = ((element: Element) => {
			// Execute all chained animations ON THE ELEMENT
			const tweens = (attachFunction as AttachFunction).animations.map(
				({ method, args }) => method(element, ...args) // Element is inserted as first argument here
			);

			// Return cleanup function
			return () => tweens.forEach((tween: gsap.core.Tween) => tween.kill());
		}) as AttachFunction;

		// Initialize with the current animation
		attachFunction.animations = [
			{
				method: gsap[methodName] as (...args: unknown[]) => gsap.core.Tween,
				args
			}
		];

		// Add chainable methods
		this.addChainableMethods(attachFunction);

		return attachFunction;
	}

	// Add chainable methods to attach function - MISSING METHOD ADDED HERE
	private addChainableMethods(attachFunction: AttachFunction) {
		ChainableMethodFactory.addStandardMethods(attachFunction);
	}
}

// Timeline class with order management and GSAP integration
class Timeline {
	private timeline: gsap.core.Timeline;
	private animationStore = new AnimationStore<TweenData>();
	public toGSAP: TimelineGSAP;

	constructor(...args: unknown[]) {
		this.timeline = gsap.timeline({ paused: true, ...args });
		this.toGSAP = new TimelineGSAP(this);
	}

	private rebuildTimeline() {
		this.timeline.clear();

		// Sort animations by order
		const store = this.animationStore['getStore']();
		const maxExplicitOrder = store.reduce((max, item) => {
			return item.order !== undefined ? Math.max(max, item.order) : max;
		}, -Infinity);

		const sortedTweens = [...store].sort((a, b) => {
			const orderA = TimelineUtils.calculateEffectiveOrder(a, maxExplicitOrder);
			const orderB = TimelineUtils.calculateEffectiveOrder(b, maxExplicitOrder);
			return orderA - orderB;
		});

		for (const { gsapMethod, element, args, position } of sortedTweens) {
			const tween = gsapMethod(element, ...args);
			// Use the stored position parameter
			if (position !== undefined && position !== '') {
				this.timeline.add(tween, position);
			} else {
				this.timeline.add(tween);
			}
		}
	}

	// Internal method for adding animations
	addAnimation(
		gsapMethod: (...args: unknown[]) => gsap.core.Tween,
		element: Element,
		args: unknown[],
		order?: number,
		position?: string | number
	): () => void {
		const id = this.animationStore.generateId();
		const tweenData = { gsapMethod, element, args, order, position, id };
		this.animationStore.addToStore(tweenData);
		this.rebuildTimeline();

		// Return cleanup function
		return () => {
			this.animationStore.removeFromStore((item) => item.id === id);
			this.rebuildTimeline();
		};
	}

	// Direct access to timeline controls
	get controls() {
		return this.timeline;
	}

	// Common timeline control methods
	play() {
		return this.timeline.play();
	}

	pause() {
		return this.timeline.pause();
	}

	paused(): boolean;
	paused(value: boolean): gsap.core.Timeline;
	paused(value?: boolean): boolean | gsap.core.Timeline {
		if (value === undefined) {
			return this.timeline.paused();
		}
		return this.timeline.paused(value);
	}

	resume() {
		return this.timeline.resume();
	}

	reverse() {
		return this.timeline.reverse();
	}

	restart() {
		return this.timeline.restart();
	}

	reversed(): boolean;
	reversed(value: boolean): gsap.core.Timeline;
	reversed(value?: boolean): boolean | gsap.core.Timeline {
		if (value === undefined) {
			return this.timeline.reversed();
		}
		return this.timeline.reversed(value);
	}

	seek(position: string | number) {
		return this.timeline.seek(position);
	}

	progress(): number;
	progress(value: number): gsap.core.Timeline;
	progress(value?: number): number | gsap.core.Timeline {
		if (value === undefined) {
			return this.timeline.progress();
		}
		return this.timeline.progress(value);
	}

	duration(): number;
	duration(value: number): gsap.core.Timeline;
	duration(value?: number): number | gsap.core.Timeline {
		if (value === undefined) {
			return this.timeline.duration();
		}
		return this.timeline.duration(value);
	}

	totalDuration(): number;
	totalDuration(value: number): gsap.core.Timeline;
	totalDuration(value?: number): number | gsap.core.Timeline {
		if (value === undefined) {
			return this.timeline.totalDuration();
		}
		return this.timeline.totalDuration(value);
	}

	time(): number;
	time(value: number): gsap.core.Timeline;
	time(value?: number): number | gsap.core.Timeline {
		if (value === undefined) {
			return this.timeline.time();
		}
		return this.timeline.time(value);
	}

	timeScale(): number;
	timeScale(value: number): gsap.core.Timeline;
	timeScale(value?: number): number | gsap.core.Timeline {
		if (value === undefined) {
			return this.timeline.timeScale();
		}
		return this.timeline.timeScale(value);
	}

	// Timeline state methods
	isActive(): boolean {
		return this.timeline.isActive();
	}

	// Timeline manipulation methods
	kill() {
		return this.timeline.kill();
	}

	clear() {
		this.animationStore.clearStore();
		return this.timeline.clear();
	}

	// Repeat and yoyo methods
	repeat(): number;
	repeat(value: number): gsap.core.Timeline;
	repeat(value?: number): number | gsap.core.Timeline {
		if (value === undefined) {
			return this.timeline.repeat();
		}
		return this.timeline.repeat(value);
	}

	repeatDelay(): number;
	repeatDelay(value: number): gsap.core.Timeline;
	repeatDelay(value?: number): number | gsap.core.Timeline {
		if (value === undefined) {
			return this.timeline.repeatDelay();
		}
		return this.timeline.repeatDelay(value);
	}

	yoyo(): boolean;
	yoyo(value: boolean): gsap.core.Timeline;
	yoyo(value?: boolean): boolean | gsap.core.Timeline {
		if (value === undefined) {
			return this.timeline.yoyo();
		}
		return this.timeline.yoyo(value);
	}

	// Delay method
	delay(): number;
	delay(value: number): gsap.core.Timeline;
	delay(value?: number): number | gsap.core.Timeline {
		if (value === undefined) {
			return this.timeline.delay();
		}
		return this.timeline.delay(value);
	}

	// Event callback methods
	eventCallback(type: gsap.CallbackType): GSAPEventCallback | null;
	eventCallback(
		type: gsap.CallbackType,
		callback: GSAPEventCallback | null,
		params?: CallbackParams,
		scope?: CallbackScope
	): gsap.core.Timeline;
	eventCallback(
		type: gsap.CallbackType,
		callback?: GSAPEventCallback | null,
		params?: CallbackParams,
		scope?: CallbackScope
	): GSAPEventCallback | null | gsap.core.Timeline {
		if (callback === undefined) {
			return this.timeline.eventCallback(type);
		}
		return this.timeline.eventCallback(type, callback, params, scope);
	}

	// Label methods
	addLabel(label: string, position?: string | number) {
		return this.timeline.addLabel(label, position);
	}

	removeLabel(label: string) {
		return this.timeline.removeLabel(label);
	}

	getLabelTime(label: string): number {
		return this.timeline.getLabelTime(label);
	}

	getLabelsArray() {
		return this.timeline.getLabelsArray();
	}

	// Timeline building methods (direct timeline manipulation)
	add(child: TimelineChild, position?: string | number) {
		return this.timeline.add(child, position);
	}

	remove(child: TimelineChild) {
		return this.timeline.remove(child);
	}

	removeFromParent() {
		return this.timeline.removeFromParent();
	}

	// Advanced timing methods
	startTime(): number;
	startTime(value: number): gsap.core.Timeline;
	startTime(value?: number): number | gsap.core.Timeline {
		if (value === undefined) {
			return this.timeline.startTime();
		}
		return this.timeline.startTime(value);
	}

	endTime(): number {
		return this.timeline.endTime();
	}

	// Utility methods
	invalidate() {
		return this.timeline.invalidate();
	}

	then(callback: (result: Omit<gsap.core.Timeline, 'then'>) => void) {
		return this.timeline.then(callback);
	}

	// Timeline introspection methods
	getChildren(nested?: boolean, tweens?: boolean, timelines?: boolean, ignoreBeforeTime?: number) {
		return this.timeline.getChildren(nested, tweens, timelines, ignoreBeforeTime);
	}

	getTweensOf(target: TweenTarget, nested?: boolean) {
		return this.timeline.getTweensOf(target, nested);
	}

	recent() {
		return this.timeline.recent();
	}
}

// TimelineGSAP class for handling attach functions with timeline integration
class TimelineGSAP {
	private timeline: Timeline;

	constructor(timeline: Timeline) {
		this.timeline = timeline;
	}

	to(
		vars: gsap.TweenVars,
		positionOrOptions?: string | number | { position?: string | number; order?: number },
		order?: number
	) {
		return this.createTimelineAttach('to', [vars], positionOrOptions, order);
	}

	from(
		vars: gsap.TweenVars,
		positionOrOptions?: string | number | { position?: string | number; order?: number },
		order?: number
	) {
		return this.createTimelineAttach('from', [vars], positionOrOptions, order);
	}

	fromTo(
		fromVars: gsap.TweenVars,
		toVars: gsap.TweenVars,
		positionOrOptions?: string | number | { position?: string | number; order?: number },
		order?: number
	) {
		return this.createTimelineAttach('fromTo', [fromVars, toVars], positionOrOptions, order);
	}

	set(
		vars: gsap.TweenVars,
		positionOrOptions?: string | number | { position?: string | number; order?: number },
		order?: number
	) {
		return this.createTimelineAttach('set', [vars], positionOrOptions, order);
	}

	private createTimelineAttach(
		methodName: keyof typeof gsap,
		baseArgs: unknown[],
		positionOrOptions?: string | number | { position?: string | number; order?: number },
		order?: number
	) {
		const { position, order: finalOrder } = TimelineUtils.parseTimelineOptions(
			positionOrOptions,
			order
		);
		const timeline = this.timeline;

		const attachFunction = ((element: Element) => {
			// Execute all chained animations
			const cleanupFunctions: (() => void)[] = [];
			const animations = (attachFunction as AttachFunction).animations || [];

			for (const { method, args, order: animOrder } of animations) {
				// For the initial animation, position comes from the parsed options
				// For chained animations, position might be in args
				let cleanArgs = args;
				let animPosition: string | number | undefined;

				// If this is the first animation and we have a position from options, use it
				if (animations.length === 1 && position !== undefined && position !== '') {
					animPosition = position;
					// Remove position from args if it was added there
					if (args.length > baseArgs.length) {
						cleanArgs = args.slice(0, baseArgs.length);
					}
				} else if (
					args.length > baseArgs.length &&
					(typeof args[args.length - 1] === 'string' || typeof args[args.length - 1] === 'number')
				) {
					// For chained animations, check if position is in args
					if (methodName !== 'set') {
						animPosition = args[args.length - 1] as string | number;
						cleanArgs = args.slice(0, -1);
					}
				}

				const cleanup = timeline.addAnimation(method, element, cleanArgs, animOrder, animPosition);
				cleanupFunctions.push(cleanup);
			}

			// Return combined cleanup function
			return () => {
				cleanupFunctions.forEach((cleanup) => cleanup());
			};
		}) as AttachFunction;

		// Initialize with the current animation - position is handled separately, not in args
		attachFunction.animations = [
			{
				method: gsap[methodName] as (...args: unknown[]) => gsap.core.Tween,
				args: baseArgs,
				...(finalOrder !== undefined && { order: finalOrder })
			}
		];

		// Add chainable methods
		ChainableMethodFactory.addTimelineMethods(attachFunction);

		return attachFunction;
	}
}

// Factory functions
export const createTimeline = (name = 'tl', ...args: unknown[]) => {
	const timeline = new Timeline(...args);
	toGSAP.registerTimeline(name, timeline);
	return timeline;
};

// ToGSAP instance for direct GSAP access with full TypeScript support
export const toGSAP = ToGSAP.getInstance();

export { gsap };
