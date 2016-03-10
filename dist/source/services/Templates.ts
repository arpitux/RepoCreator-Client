import { autoinject } from 'aurelia-dependency-injection';
import { computedFrom } from 'aurelia-binding';
import { EventAggregator } from 'aurelia-event-aggregator';
import { Repository } from 'source/models/Repository';
import { RepositoryViewModel } from 'source/view-models/RepositoryViewModel';
import { Repositories } from 'source/services/Repositories';
import { RepoCreator } from 'source/services/RepoCreator';
import { OAuth } from 'source/services/OAuth-Auth0';
import { GitHub } from 'source/services/GitHub';
import underscore from 'underscore';
import wu from 'wu';

@autoinject
export class Templates {
	constructor(
		private oAuth: OAuth,
		private gitHub: GitHub,
		private repoCreator: RepoCreator,
		private repositories: Repositories,
		private eventAggregator: EventAggregator
	) {}

	public get all(): Iterable<RepositoryViewModel> {
		return wu(this.repositories.repositories.values()).map(repository => new RepositoryViewModel(repository));
	}

	public searchGitHub = (searchInput: string): Promise<void> => {
		// clear out previous search (assume that if we have no repo creator metadata then it was a GitHub search result)
		wu(this.repositories.repositories.entries())
			.filter(pair => !pair[1].repoCreatorMetadata)
			.forEach(pair => this.repositories.repositories.delete(pair[0]));

		return this.gitHub.search(searchInput).then(searchResults => {
			this.repositories.addMany(wu(searchResults).map(searchResult => Repository.deserializeFromGitHub(searchResult)));
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	public fetchAllWithoutLoginPrompt = (): void => {
		this.fetchSponsored();
		this.fetchPopular();
		if (this.oAuth.isLoggedOrLoggingIn) {
			this.fetchFavorites();
		}
	}

	public fetchAllWithLoginPrompt = (): void => {
		this.fetchFavorites();
		this.fetchSponsored();
		this.fetchPopular();
	}

	public fetchFavorites = (): Promise<void> => {
		return this.repoCreator.getFavorites()
			.then(favorites =>  this.repositories.addMany(favorites))
			.catch((error: Error) => this.eventAggregator.publish(error));
	}

	public fetchSponsored = (): Promise<void> => {
		return this.repoCreator.getSponsored()
			.then(sponsoreds => this.repositories.addMany(sponsoreds))
			.catch((error: Error) => this.eventAggregator.publish(error));
	}

	public fetchPopular = (): Promise<void> => {
		return this.repoCreator.getPopular()
			.then(this.repositories.addMany)
			.catch((error: Error) => this.eventAggregator.publish(error));
	}

	public addFavorite = (viewModel: RepositoryViewModel): Promise<void> => {
		return this.repoCreator.addFavorite(viewModel.repository.key)
			.then(x => this.repoCreator.getRepositoryMetadata(viewModel.repository.key))
			.then(metadata => { viewModel.repository.repoCreatorMetadata = metadata })
			.catch((error: Error) => this.eventAggregator.publish(error));
	}

	public removeFavorite = (viewModel: RepositoryViewModel): Promise<void> => {
		return this.repoCreator.removeFavorite(viewModel.repository.key)
			.then(x => this.repoCreator.getRepositoryMetadata(viewModel.repository.key))
			.then(metadata => { viewModel.repository.repoCreatorMetadata = metadata })
			.catch((error: Error) => this.eventAggregator.publish(error));
	}

	public sponsor = (viewModel: RepositoryViewModel): Promise<void> => {
		if (viewModel.isMySponsored)
			return;

		return this.repoCreator.sponsor(viewModel.repository.key)
			.then(x => this.repoCreator.getRepositoryMetadata(viewModel.repository.key))
			.then(metadata => { viewModel.repository.repoCreatorMetadata = metadata })
			.catch((error: Error) => this.eventAggregator.publish(error));
	}

	public cancelSponsorship = (viewModel: RepositoryViewModel): Promise<void> => {
		if (!viewModel.isMySponsored)
			return;

		return this.repoCreator.cancelSponsorship(viewModel.repository.key)
			.then(x => this.repoCreator.getRepositoryMetadata(viewModel.repository.key))
			.then(metadata => { viewModel.repository.repoCreatorMetadata = metadata })
			.catch((error: Error) => this.eventAggregator.publish(error));
	}
}
