import { computedFrom } from 'aurelia-binding';
import { autoinject } from 'aurelia-dependency-injection';
import { DialogService } from 'aurelia-dialog';
import { EventAggregator } from 'aurelia-event-aggregator';
import { OAuth } from 'source/services/OAuth-Auth0';
import { GitHub } from 'source/services/GitHub';
import { StripeCheckout, StripeToken } from 'source/services/StripeCheckout';
import { ScaffoldModal } from 'source/components/scaffold-modal';
import { RepoCreator } from 'source/services/RepoCreator';
import { Repository } from 'source/models/Repository';
import underscore from 'underscore';

@autoinject
export class RepositoryChooser {
	protected allTemplates: RepositoryViewModel[] = [];
	private currentFilter: RepoFilter = RepoFilter.All;

	constructor(
		private oAuth: OAuth,
		private stripeCheckout: StripeCheckout,
		private repoCreator: RepoCreator,
		private gitHub: GitHub,
		private dialogService: DialogService,
		private eventAggregator: EventAggregator
	) {}

	activate() {
		this.fetchSponsored();
		this.fetchPopular();
		if (this.oAuth.isLoggedOrLoggingIn)
			this.fetchFavorites();
	}

	@computedFrom('allTemplates', 'currentFilter')
	get filteredTemplates(): RepositoryViewModel[] {
		return this.allTemplates.filter(repository => {
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

	launchScaffolding = (repository: Repository): void => {
		this.dialogService.open({
			viewModel: ScaffoldModal,
			model: repository,
			lock: false
		}).catch((error: Error) => this.eventAggregator.publish(error))
	}

	filter = (newFilter: RepoFilter): void => {
		this.currentFilter = newFilter;
		if (this.currentFilter == RepoFilter.Favorite)
			this.fetchFavorites();
		if (this.currentFilter == RepoFilter.Sponsored)
			this.fetchSponsored();
	}

	private fetchFavorites = (): void => {
		this.repoCreator.getFavorites().then(favorites => {
			let favoriteTemplates = underscore(favorites).map(favorite => new RepositoryViewModel(favorite, "", "images/zoltu.png", 10, false, false, true, false));
			this.mergeTemplates(favoriteTemplates);
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	private fetchSponsored = (): void => {
		this.repoCreator.getSponsored().then((repos: Repository[]) => {
			let sponsoredTemplates = underscore(repos).map(repo => new RepositoryViewModel(repo, "", "images/zoltu.png", 5, true, false, false, false));
			this.mergeTemplates(sponsoredTemplates);
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	private fetchPopular = (): void => {
		this.repoCreator.getPopular().then((repos: Repository[]) => {
			let popularTemplates = underscore(repos).map(repo => new RepositoryViewModel(repo, "", "images/zoltu.png", 0, false, true, false, false));
			this.mergeTemplates(popularTemplates);
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	private mergeTemplates = (repos: RepositoryViewModel[]) => {
		repos.forEach(repo => {
			let match: RepositoryViewModel = underscore(this.allTemplates).find(existingRepo => existingRepo.equals(repo));
			if (match)
				match.merge(repo);
			else
				this.allTemplates.push(repo);
		});
		let tempFilter = this.currentFilter;
		this.currentFilter = (tempFilter == RepoFilter.All) ? RepoFilter.Sponsored : RepoFilter.All;
		this.currentFilter = tempFilter;
	}

	// required for Aurelia template binding
	private RepoFilter: any = RepoFilter;
}

class RepositoryViewModel {
	constructor(
		public repository: Repository,
		public description: string,
		public icon: string,
		public favoriteCount: number,
		public isSponsored: boolean,
		public isPopular: boolean,
		public isFavorite: boolean,
		public isMySponsored: boolean
	) {
	}

	@computedFrom("isFavorite", "isSponsored", "isMySponsored", "isPopular")
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

	public equals = (other: RepositoryViewModel): boolean => {
		return this.repository.owner == other.repository.owner
			&& this.repository.name == other.repository.name;
	}

	public merge = (other: RepositoryViewModel): void => {
		this.isFavorite = this.isFavorite || other.isFavorite;
		this.isSponsored = this.isSponsored || other.isSponsored;
		this.isMySponsored = this.isMySponsored || other.isMySponsored;
		this.isPopular = this.isPopular || other.isPopular;
	}
}

enum RepoFilter {
	All,
	Sponsored,
	Popular,
	Favorite,
	MySponsored,
}
