import { computedFrom } from 'aurelia-binding';
import { autoinject } from 'aurelia-dependency-injection';
import { DialogService } from 'aurelia-dialog';
import { EventAggregator } from 'aurelia-event-aggregator';
import { ScaffoldModal } from 'source/components/scaffold-modal';
import { Repository } from 'source/models/Repository';
import Isotope from 'isotope';

@autoinject
export class RepositoryChooser {
	protected allTemplates: RepositoryViewModel[] = [
		new RepositoryViewModel(new Repository("GitHub", "owner", "name"), "description", "images/zoltu.png", 1, true, false, false, false),
		new RepositoryViewModel(new Repository("GitHub", "zoltu", "c#"), "my template!", "images/zoltu.png", 100, false, true, false, false),
		new RepositoryViewModel(new Repository("GitHub", "foo", "bar"), "Long description.  Maybe several lines.  Who knows!  GitHub might have a limit but I don't know what it is so we should be prepared for anything (or find out the limit).", "images/zoltu.png", 1, false, false, true, false),
		new RepositoryViewModel(new Repository("GitHub", "zip", "zap"), "", "images/zoltu.png", 100, false, false, false, true),
		new RepositoryViewModel(new Repository("GitHub", "apple", "banana"), "☃", "images/zoltu.png", 1, true, true, true, true),
		new RepositoryViewModel(new Repository("GitHub", "", ""), "no owner or name!", "images/zoltu.png", 100, false, false, false, false),
	];
	private isotope: Isotope;

	constructor(
		private dialogService: DialogService,
		private eventAggregator: EventAggregator
	) {}

	launchScaffolding(repository: Repository) {
		this.dialogService.open({
			viewModel: ScaffoldModal,
			model: repository,
			lock: false
		}).catch((error: Error) => this.eventAggregator.publish(error))
	}

	attached() {
		this.isotope = new Isotope(".template-filter-container", { itemSelector: '.portfolio-item' });
	}

	protected filter(filterSelector: string) {
		this.isotope.arrange({ filter: filterSelector });
	}

	protected imageOnLoad() {
		this.isotope.layout();
	}
}

class RepositoryViewModel {
	constructor(
		private repository: Repository,
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
