import { Repository } from 'source/models/Repository';

export class RepositoryViewModel {
	constructor(
		public repository: Repository
	) {}

	public get owner(): string {
		return this.repository.gitHubMetadata && this.repository.gitHubMetadata.owner || "unknown";
	}

	public get name(): string {
		return this.repository.gitHubMetadata && this.repository.gitHubMetadata.name || "unknown";
	}

	public get description(): string {
		return this.repository.gitHubMetadata && this.repository.gitHubMetadata.description || "";
	}

	public get gitHubLink(): string {
		return `https://github.com/${this.owner}/${this.name}`;
	}

	public get icon(): string {
		return `images/templates-bg/javascript.png`;
	}

	public get isSponsored(): boolean {
		return this.repository.repoCreatorMetadata && this.repository.repoCreatorMetadata.sponsored || false;
	}

	public get isFavorite(): boolean {
		return this.repository.repoCreatorMetadata && this.repository.repoCreatorMetadata.favorite || false;
	}

	public get isPopular(): boolean {
		return this.repository.repoCreatorMetadata && this.repository.repoCreatorMetadata.favoriteCount > 1 || false;
	}

	public get isMySponsored(): boolean {
		return this.repository.repoCreatorMetadata && this.repository.repoCreatorMetadata.mySponsored || false;
	}

	public get favoriteCount(): number {
		return this.repository.repoCreatorMetadata && this.repository.repoCreatorMetadata.favoriteCount || 0;
	}

	public equals = (other: RepositoryViewModel): boolean => {
		return this.repository.equals(other.repository);
	}

	public getCssFilters = (): string => {
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
