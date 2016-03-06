// Full API can be found at http://fitzgen.github.io/wu.js/#API
declare module "wu" {
	export interface Wu<T> extends Iterable<T> {
		chain(...iterables: Iterable<T>[]): Iterable<T>;
		concatMap<TResult>(mapper: (item: T) => Iterable<TResult>): Wu<TResult>;
		filter(predicate: (item: T) => boolean): Wu<T>;
		forEach(applicator: (item: T) => void): void;
		map<TResult>(mapper: (item: T) => TResult): Wu<TResult>;
		tap(consumer: (item: T) => void): Wu<T>;
	}

	var WuStatic: {
		<T>(iterable: Iterable<T>): Wu<T>;
	}

	export default WuStatic;
}
