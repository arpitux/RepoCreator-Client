import { autoinject } from 'aurelia-dependency-injection';
import { computedFrom } from 'aurelia-binding';
import { EventAggregator } from 'aurelia-event-aggregator';
import { Repository as RepositoryWireModel } from 'source/models/Repository';
import { RepoCreator } from 'source/services/RepoCreator';
import { OAuth } from 'source/services/OAuth-Auth0';
import underscore from 'underscore';

@autoinject
export class Templates {
	private allTemplates: RepositoryViewModel[] = [];

	constructor(
		private oAuth: OAuth,
		private repoCreator: RepoCreator,
		private eventAggregator: EventAggregator
	) {}

	@computedFrom('allTemplates')
	public get all(): RepositoryViewModel[] {
		return this.allTemplates;
	}

	public fetchAllWithoutLoginPrompt = (): void => {
		this.fetchSponsored();
		this.fetchPopular();
		if (this.oAuth.isLoggedOrLoggingIn) {
			this.fetchFavorites();
			this.fetchMySponsored();
		}
	}

	public fetchAllWithLoginPrompt = (): void => {
		this.fetchSponsored();
		this.fetchPopular();
		this.fetchFavorites();
		this.fetchMySponsored();
	}

	public fetchFavorites = (): void => {
		this.repoCreator.getFavorites().then(wireModels => {
			let favoriteTemplates = underscore(wireModels).map(wireModel => new RepositoryViewModel(wireModel, "", "images/zoltu.png", 10, false, false, true, false));
			this.mergeTemplates(favoriteTemplates);
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	public fetchSponsored = (): void => {
		this.repoCreator.getSponsored().then(wireModels => {
			let sponsoredTemplates = underscore(wireModels).map(wireModel => new RepositoryViewModel(wireModel, "", "images/zoltu.png", 5, true, false, false, false));
			this.mergeTemplates(sponsoredTemplates);
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	public fetchPopular = (): void => {
		this.repoCreator.getPopular().then(wireModels => {
			let popularTemplates = underscore(wireModels).map(wireModel => new RepositoryViewModel(wireModel, "", "images/zoltu.png", 0, false, true, false, false));
			this.mergeTemplates(popularTemplates);
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	public fetchMySponsored = (): void => {
		this.repoCreator.getMyRepositories().then(wireModels => {
			let mySponsoredTemplates = underscore(wireModels).map(sponsoredWireModel => new RepositoryViewModel(sponsoredWireModel.repository, "", "images/zoltu.png", 0, false, false, false, true));
			this.mergeTemplates(mySponsoredTemplates);
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	public addFavorite = (viewModel: RepositoryViewModel): void => {
		this.repoCreator.addFavorite(viewModel.wireModel).then(wireModels => {
			let favoriteTemplates = underscore(wireModels).map(wireModel => new RepositoryViewModel(wireModel, "", "images/zoltu.png", 10, false, false, true, false));
			this.clearFavorites();
			this.mergeTemplates(favoriteTemplates);
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	public removeFavorite = (viewModel: RepositoryViewModel): void => {
		this.repoCreator.removeFavorite(viewModel.wireModel).then(wireModels => {
			let favoriteTemplates = underscore(wireModels).map(wireModel => new RepositoryViewModel(wireModel, "", "images/zoltu.png", 10, false, false, true, false));
			this.clearFavorites();
			this.mergeTemplates(favoriteTemplates);
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	public sponsor = (viewModel: RepositoryViewModel): void => {
		if (viewModel.isMySponsored)
			return;

		this.repoCreator.sponsor(viewModel.wireModel).then(wireModels => {
			let sponsoredTemplates = underscore(wireModels).map(wireModel => new RepositoryViewModel(wireModel, "", "images/zoltu.png", 5, true, false, false, false));
			this.clearSponsored();
			this.mergeTemplates(sponsoredTemplates);
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	public cancelSponsorship = (viewModel: RepositoryViewModel): void => {
		if (!viewModel.isMySponsored)
			return;

		this.repoCreator.cancelSponsorship(viewModel.wireModel)
			.then(x => viewModel.isMySponsored = false)
			.catch((error: Error) => this.eventAggregator.publish(error));
	}

	private clearFavorites = () => {
		underscore(this.allTemplates)
			.each(template => template.isFavorite = false);
	}

	private clearSponsored = () => {
		underscore(this.allTemplates)
			.each(template => template.isSponsored = false);
	}

	private mergeTemplates = (repos: RepositoryViewModel[]) => {
		repos.forEach(repo => {
			let match: RepositoryViewModel = underscore(this.allTemplates).find(existingRepo => existingRepo.equals(repo));
			if (match)
				match.merge(repo);
			else
				this.allTemplates.push(repo);
		});
	}
}

export class RepositoryViewModel {
	public gitHubLink: string;

	constructor(
		public wireModel: RepositoryWireModel,
		public description: string,
		public icon: string,
		public favoriteCount: number,
		public isSponsored: boolean,
		public isPopular: boolean,
		public isFavorite: boolean,
		public isMySponsored: boolean
	) {
		this.gitHubLink = `https://github.com/${this.wireModel.owner}/${this.wireModel.name}`;
	}

	public equals = (other: RepositoryViewModel): boolean => {
		return this.wireModel.owner == other.wireModel.owner
			&& this.wireModel.name == other.wireModel.name;
	}

	public merge = (other: RepositoryViewModel): void => {
		this.isFavorite = this.isFavorite || other.isFavorite;
		this.isSponsored = this.isSponsored || other.isSponsored;
		this.isMySponsored = this.isMySponsored || other.isMySponsored;
		this.isPopular = this.isPopular || other.isPopular;
	}
}
