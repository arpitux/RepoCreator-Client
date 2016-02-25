import { computedFrom } from 'aurelia-binding';
import Isotope from 'isotope';

export class RepositoryChooser {
	protected allTemplates: RepositoryViewModel[] = [
		new RepositoryViewModel("owner", "name", "description", "images/zoltu-icon-64x64.png", 1, true, false, false, false),
		new RepositoryViewModel("zoltu", "c#", "my template!", "images/zoltu-icon-64x64.png", 100, false, true, false, false),
		new RepositoryViewModel("foo", "bar", "Long description.  Maybe several lines.  Who knows!  GitHub might have a limit but I don't know what it is so we should be prepared for anything (or find out the limit).", "images/zoltu-icon-64x64.png", 1, false, false, true, false),
		new RepositoryViewModel("zip", "zap", "", "images/zoltu-icon-64x64.png", 100, false, false, false, true),
		new RepositoryViewModel("apple", "banana", "☃", "images/zoltu-icon-64x64.png", 1, true, true, true, true),
		new RepositoryViewModel("", "", "no owner or name!", "images/zoltu-icon-64x64.png", 100, false, false, false, false),
	];
	private isotope: Isotope;

	attached() {
		this.isotope = new Isotope(".template-filter-container", { itemSelector: '.portfolio-item' });
	}

	protected filter(filterSelector: string) {
		this.isotope.arrange({ filter: filterSelector });
	}
}

class RepositoryViewModel {
	constructor(
		private owner: string,
		private name: string,
		private description: string,
		private icon: string,
		private favoriteCount: number,
		private isSponsored: boolean,
		private isPopular: boolean,
		private isFavorite: boolean,
		private isMySponsored: boolean
	) {
	}

	@computedFrom("isFavorite", "isSponsored", "isMySponsored")
	protected get cssFilters() : string {
		let selectors: string[] = [];
		if (this.isFavorite)
			selectors.push('favorite');
		if (this.isSponsored)
			selectors.push('sponsored');
		if (this.isMySponsored)
			selectors.push('my-sponsored');
		if (this.isPopular)
			selectors.push('popular');

		return selectors.join(' ');
	}

}