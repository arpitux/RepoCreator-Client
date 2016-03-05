import { computedFrom } from 'aurelia-binding';
import { autoinject } from 'aurelia-dependency-injection';
import { DialogService } from 'aurelia-dialog';
import { EventAggregator } from 'aurelia-event-aggregator';
import { GitHub } from 'source/services/GitHub';
import { ScaffoldModal } from 'source/components/scaffold-modal';
import { Templates } from 'source/services/Templates';
import { Repository as RepositoryWireModel } from 'source/models/Repository';
import { RepositoryViewModel } from 'source/services/Templates';
import underscore from 'underscore';

@autoinject
export class RepositoryChooser {
	private currentFilter: RepoFilter = RepoFilter.All;
	private unreadError: string = null;

	constructor(
		private templates: Templates,
		private gitHub: GitHub,
		private dialogService: DialogService,
		private eventAggregator: EventAggregator
	) {
		this.eventAggregator.subscribe(Error, (error: Error) => this.unreadError = error.message);
	}

	activate() {
		this.templates.fetchAllWithoutLoginPrompt();
	}

	//@computedFrom('currentFilter')
	get filteredTemplates(): RepositoryViewModel[] {
		return this.templates.all.filter(repository => {
			switch (this.currentFilter) {
				case RepoFilter.All:
					return true;
				case RepoFilter.Favorite:
					return repository.isFavorite;
				case RepoFilter.MySponsored:
					return repository.isMySponsored;
				case RepoFilter.Popular:
					return repository.isPopular;
				case RepoFilter.Sponsored:
					return repository.isSponsored;
				default:
					throw new Error("Unexpected RepoFilter enum value.");
			}
		}).sort((a, b): number => {
			if (a.isSponsored && !b.isSponsored)
				return -1;
			if (b.isSponsored && !a.isSponsored)
				return 1;
			return 0;
		});
	}

	launchScaffolding = (repository: RepositoryViewModel): void => {
		this.dialogService.open({
			viewModel: ScaffoldModal,
			model: repository,
			lock: true
		}).catch((error: Error) => this.eventAggregator.publish(error))
	}

	filter = (newFilter: RepoFilter): void => {
		this.currentFilter = newFilter;
		if (this.currentFilter == RepoFilter.Favorite
			|| this.currentFilter == RepoFilter.MySponsored)
			this.templates.fetchAllWithLoginPrompt();
	}

	getCssFilters = (repository: RepositoryViewModel): string => {
		let selectors: string[] = [];
		if (repository.isFavorite)
			selectors.push('favorite');
		if (repository.isSponsored)
			selectors.push('sponsored');
		if (repository.isMySponsored)
			selectors.push('my-sponsored');
		if (repository.isPopular)
			selectors.push('popular');

		return selectors.join(' ');
	}

	// required for Aurelia template binding
	private RepoFilter: any = RepoFilter;
}

enum RepoFilter {
	All,
	Sponsored,
	Popular,
	Favorite,
	MySponsored,
}
