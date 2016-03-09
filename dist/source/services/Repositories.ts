import { autoinject } from 'aurelia-dependency-injection';
import { HttpResponseMessage } from 'aurelia-http-client';
import { EventAggregator } from 'aurelia-event-aggregator';
import { GitHub } from 'source/services/GitHub';
import { RepoCreator } from 'source/services/RepoCreator';
import { RepositoryKey, Repository, RepositoryGitHubMetadata, RepositoryRepoCreatorMetadata } from 'source/models/Repository';
import wu from 'wu';

@autoinject
export class Repositories {
	public repositories = new Map<string, Repository>();

	constructor(
		private gitHub: GitHub,
		private repoCreator: RepoCreator,
		private eventAggregator: EventAggregator
	) {}

	public add = (newRepository: Repository) => {
		let key = newRepository.key.toString();
		let mergedRepository = (this.repositories.has(key))
			? this.repositories.get(key).mergeIn(newRepository)
			: newRepository;

		if (mergedRepository.gitHubMetadata == null)
			this.updateGitHubMetadata(mergedRepository);

		if (mergedRepository.repoCreatorMetadata == null)
			this.updateRepoCreatorMetadata(mergedRepository);

		this.repositories.set(key, mergedRepository);
	}

	public addMany = (newRepositories: Iterable<Repository>) => {
		wu(newRepositories).forEach(this.add);
	}


	private updateGitHubMetadata = (repository: Repository) => {
		this.gitHub.getRepository(repository.key.id).then(searchResult => {
			repository.gitHubMetadata = RepositoryGitHubMetadata.deserialize(searchResult);
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}

	private updateRepoCreatorMetadata = (repository: Repository) => {
		this.repoCreator.getRepositoryMetadata(repository.key).then(metadata => {
			repository.repoCreatorMetadata = metadata;
		}).catch((error: Error) => {
			this.eventAggregator.publish(error);
		});
	}
}
