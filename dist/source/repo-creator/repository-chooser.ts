import Isotope from 'isotope';

export class RepositoryChooser {
	protected allTemplates: RepositoryViewModel[] = [
		new RepositoryViewModel("owner", "name", "description", "images/zoltu-icon-64x64.png", 1, true, false),
		new RepositoryViewModel("zoltu", "c#", "my template!", "images/zoltu-icon-64x64.png", 100, false, true)
	];
	private isotope: Isotope;

	attached() {
		this.isotope = new Isotope(".template-filter-container", { itemSelector: '.portfolio-item' });
	}

	protected filter(filterSelector: string) {
		this.isotope.arrange({ filter: (element) => {
			console.log(element);
		} });
	}
}

class RepositoryViewModel {
	constructor(
		private owner: string,
		private name: string,
		private description: string,
		private icon: string,
		private favoriteCount: number,
		private isFavorite: boolean,
		private isSponsored: boolean
	) {
	}
}