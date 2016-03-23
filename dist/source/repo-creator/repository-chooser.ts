import { computedFrom } from 'aurelia-binding';
import { autoinject } from 'aurelia-dependency-injection';
import { DialogService } from 'aurelia-dialog';
import { EventAggregator } from 'aurelia-event-aggregator';
import { GitHub } from 'source/services/GitHub';
import { ScaffoldModal } from 'source/components/scaffold-modal';
import { Templates } from 'source/services/Templates';
import { Repositories } from 'source/services/Repositories';
import { Repository } from 'source/models/Repository';
import { RepositoryViewModel } from 'source/view-models/RepositoryViewModel';
import underscore from 'underscore';
import wu from 'wu';

@autoinject
export class RepositoryChooser {
	private currentFilter: RepoFilter = RepoFilter.All;
	private unreadError: string = null;
	private searchInput: string = "";

	constructor(
		private templates: Templates,
		private gitHub: GitHub,
		private dialogService: DialogService,
		private eventAggregator: EventAggregator
	) {
		trackJs.configure({ onError: payload => {
			if (payload.message.startsWith('404') && payload.message.includes('https://repocreator-api.zoltu.io/api/repository/GitHub/'))
				return false;
			return true;
		}});

		this.eventAggregator.subscribe(Error, (error: Error) => this.unreadError = error.message || "Unkown error occurred.");
		this.eventAggregator.subscribe(Error, (error: Error) => Rollbar.error(error.message || "No .message", error));
		this.eventAggregator.subscribe(Error, (error: Error) => trackJs.track(error));
	}

	activate() {
		this.templates.fetchAllWithoutLoginPrompt();
	}

	get filteredTemplates(): RepositoryViewModel[] {
		return Array.from(wu(this.templates.all).filter(repository => {
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
		})).sort((a, b): number => {
			if (a.isSponsored && !b.isSponsored)
				return -1;
			if (b.isSponsored && !a.isSponsored)
				return 1;
			return b.favoriteCount - a.favoriteCount;
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
		if (this.currentFilter == RepoFilter.Favorite)
			this.templates.fetchFavorites();
		if (this.currentFilter == RepoFilter.MySponsored) {
			this.templates.fetchFavorites();
			this.templates.fetchSponsored();
		}
	}

	searchGitHub = (): void => {
		if (!this.searchInput)
			return;
		this.templates.searchGitHub(this.searchInput);
	}

	clearError = (): void => {
		this.unreadError = null;
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
